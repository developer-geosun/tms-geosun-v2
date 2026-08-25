package com.geosun.tms.routes.service;

import com.geosun.tms.routes.config.CountryBreakdownProperties;
import com.geosun.tms.routes.config.HereProperties;
import com.geosun.tms.routes.domain.Route;
import com.geosun.tms.routes.domain.RouteCountryDistance;
import com.geosun.tms.routes.domain.RouteGeometryCacheEntry;
import com.geosun.tms.routes.domain.RoutePoint;
import com.geosun.tms.routes.dto.response.CountryDistanceDto;
import com.geosun.tms.routes.repository.RouteCountryDistanceRepository;
import com.geosun.tms.routes.repository.RouteGeometryCacheRepository;
import io.micrometer.core.instrument.MeterRegistry;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class CountryBreakdownService {
  private final RouteCountryDistanceRepository routeCountryDistanceRepository;
  private final RouteGeometryCacheRepository routeGeometryCacheRepository;
  private final HereRoutingClient hereRoutingClient;
  private final HereProperties hereProperties;
  private final CountryBreakdownProperties countryBreakdownProperties;
  private final GeoJsonCountryBreakdownStrategy geoJsonCountryBreakdownStrategy;
  private final MeterRegistry meterRegistry;

  public CountryBreakdownService(
      RouteCountryDistanceRepository routeCountryDistanceRepository,
      RouteGeometryCacheRepository routeGeometryCacheRepository,
      HereRoutingClient hereRoutingClient,
      HereProperties hereProperties,
      CountryBreakdownProperties countryBreakdownProperties,
      GeoJsonCountryBreakdownStrategy geoJsonCountryBreakdownStrategy,
      MeterRegistry meterRegistry) {
    this.routeCountryDistanceRepository = routeCountryDistanceRepository;
    this.routeGeometryCacheRepository = routeGeometryCacheRepository;
    this.hereRoutingClient = hereRoutingClient;
    this.hereProperties = hereProperties;
    this.countryBreakdownProperties = countryBreakdownProperties;
    this.geoJsonCountryBreakdownStrategy = geoJsonCountryBreakdownStrategy;
    this.meterRegistry = meterRegistry;
  }

  @Transactional(readOnly = true)
  public List<CountryDistanceDto> listStoredOnly(Route route) {
    List<RouteCountryDistance> existing =
        routeCountryDistanceRepository.findByRouteIdOrderByAlongRouteOrderAscCountryCodeAsc(
            route.getId());
    return toDto(existing);
  }

  @Transactional
  public List<CountryDistanceDto> getOrCalculate(Route route) {
    List<RouteCountryDistance> existing =
        routeCountryDistanceRepository.findByRouteIdOrderByAlongRouteOrderAscCountryCodeAsc(
            route.getId());
    if (!existing.isEmpty() && !looksLikeStaleSingleCountryBreakdown(route, existing)) {
      return toDto(existing);
    }
    if (!existing.isEmpty()) {
      routeCountryDistanceRepository.deleteByRouteId(route.getId());
    }

    List<HereRoutingClient.CountryBreakdownRow> rows = calculateBreakdown(route);
    if (rows.isEmpty()) {
      return List.of();
    }

    routeCountryDistanceRepository.deleteByRouteId(route.getId());
    List<RouteCountryDistance> toSave = new ArrayList<>(rows.size());
    for (int i = 0; i < rows.size(); i++) {
      HereRoutingClient.CountryBreakdownRow row = rows.get(i);
      RouteCountryDistance distance = new RouteCountryDistance();
      distance.setRoute(route);
      distance.setCountryCode(row.countryCode());
      distance.setAlongRouteOrder(i);
      distance.setDistanceMeters(Math.max(0, row.distanceMeters()));
      distance.setDurationSeconds(row.durationSeconds());
      toSave.add(distance);
    }
    List<RouteCountryDistance> saved = routeCountryDistanceRepository.saveAll(toSave);
    return toDto(saved);
  }

  private List<HereRoutingClient.CountryBreakdownRow> calculateBreakdown(Route route) {
    if (countryBreakdownProperties.provider() == CountryBreakdownProperties.Provider.GEOJSON) {
      return geoJsonCountryBreakdownStrategy.calculate(route);
    }
    return loadFromHereOrFallback(route);
  }

  private List<CountryDistanceDto> toDto(List<RouteCountryDistance> items) {
    return items.stream()
        .sorted(
            Comparator.comparingInt(
                (@NonNull RouteCountryDistance item) -> item.getAlongRouteOrder()))
        .map(
            item ->
                new CountryDistanceDto(
                    item.getCountryCode(),
                    item.getDistanceMeters(),
                    item.getDurationSeconds(),
                    item.getAlongRouteOrder()))
        .toList();
  }

  private List<HereRoutingClient.CountryBreakdownRow> loadFromHereOrFallback(Route route) {
    String cacheKey = buildCacheKey(route);
    try {
      meterRegistry.counter("here.calls.total").increment();
      RouteGeometryCacheEntry cacheEntry =
          routeGeometryCacheRepository
              .findByCacheKeyAndExpiresAtAfter(cacheKey, Instant.now())
              .orElse(null);
      if (cacheEntry != null) {
        meterRegistry.counter("here.cache.hit").increment();
        List<HereRoutingClient.CountryBreakdownRow> cached =
            hereRoutingClient.parseCountryBreakdown(cacheEntry.getResponseJson());
        if (!cached.isEmpty()) {
          return collapseByCountry(cached);
        }
      }

      String raw = hereRoutingClient.fetchCountryBreakdownRaw(route);
      RouteGeometryCacheEntry newEntry = new RouteGeometryCacheEntry();
      newEntry.setCacheKey(cacheKey);
      newEntry.setResponseJson(raw);
      newEntry.setExpiresAt(
          Instant.now().plusSeconds(Math.max(60, hereProperties.cacheTtlSeconds())));
      routeGeometryCacheRepository.save(newEntry);
      List<HereRoutingClient.CountryBreakdownRow> parsed =
          hereRoutingClient.parseCountryBreakdown(raw);
      if (!parsed.isEmpty()) {
        return collapseByCountry(parsed);
      }
    } catch (Exception ex) {
      meterRegistry.counter("here.calls.failed").increment();
    }
    return fallbackFromRoute(route);
  }

  private static List<HereRoutingClient.CountryBreakdownRow> collapseByCountry(
      List<HereRoutingClient.CountryBreakdownRow> rows) {
    Map<String, long[]> grouped = new LinkedHashMap<>();
    for (HereRoutingClient.CountryBreakdownRow row : rows) {
      long[] values = grouped.computeIfAbsent(row.countryCode(), key -> new long[] {0, 0});
      values[0] += Math.max(0, row.distanceMeters());
      if (row.durationSeconds() != null) {
        values[1] += Math.max(0, row.durationSeconds());
      }
    }
    return grouped.entrySet().stream()
        .map(
            entry ->
                new HereRoutingClient.CountryBreakdownRow(
                    entry.getKey(),
                    entry.getValue()[0],
                    entry.getValue()[1] > 0 ? entry.getValue()[1] : null))
        .toList();
  }

  /**
   * Старий fallback зберігав лише одну країну, якщо в точках було ≥2 коди країн (типово UA на КПП +
   * PL у фіналі).
   */
  private static boolean looksLikeStaleSingleCountryBreakdown(
      Route route, List<RouteCountryDistance> existing) {
    if (existing.size() != 1) {
      return false;
    }
    if (route.getPoints() == null || route.getPoints().isEmpty()) {
      return false;
    }
    long distinctCountries =
        route.getPoints().stream()
            .map((@NonNull RoutePoint point) -> point.getCountry())
            .filter(StringUtils::hasText)
            .map(c -> c.toUpperCase())
            .distinct()
            .count();
    return distinctCountries >= 2;
  }

  private static List<HereRoutingClient.CountryBreakdownRow> fallbackFromRoute(Route route) {
    Map<String, long[]> grouped = new LinkedHashMap<>();
    List<RoutePoint> points =
        route.getPoints().stream()
            .sorted(Comparator.comparing((@NonNull RoutePoint point) -> point.getPointOrder()))
            .toList();
    for (int i = 0; i < points.size(); i++) {
      RoutePoint from = points.get(i);
      if (from.getSegmentDistanceKmToNext() == null) {
        continue;
      }
      RoutePoint to = i + 1 < points.size() ? points.get(i + 1) : null;
      if (to == null) {
        continue;
      }
      long distanceMeters =
          Math.max(
              0L,
              from.getSegmentDistanceKmToNext().multiply(BigDecimal.valueOf(1000L)).longValue());
      distributeSegmentDistanceToCountries(grouped, from, to, distanceMeters);
    }
    return grouped.entrySet().stream()
        .map(
            entry ->
                new HereRoutingClient.CountryBreakdownRow(
                    entry.getKey(), entry.getValue()[0], null))
        .toList();
  }

  /**
   * Розподіл довжини сегмента між країнами без полілінії: враховуємо прапорець КПП та різні коди країн
   * у кінцевих точках сегмента.
   */
  private static void distributeSegmentDistanceToCountries(
      Map<String, long[]> grouped, RoutePoint from, RoutePoint to, long distanceMeters) {
    if (distanceMeters <= 0) {
      return;
    }
    String fromCountry = normalizeCountryCode(from.getCountry());
    String toCountry = normalizeCountryCode(to.getCountry());

    if (to.isBorder()) {
      if (fromCountry != null) {
        addMetersForCountry(grouped, fromCountry, distanceMeters);
      }
      return;
    }
    if (from.isBorder()) {
      if (toCountry != null) {
        addMetersForCountry(grouped, toCountry, distanceMeters);
      } else if (fromCountry != null) {
        addMetersForCountry(grouped, fromCountry, distanceMeters);
      }
      return;
    }
    if (fromCountry != null && toCountry != null && fromCountry.equals(toCountry)) {
      addMetersForCountry(grouped, fromCountry, distanceMeters);
      return;
    }
    if (fromCountry != null && toCountry != null) {
      long firstHalf = distanceMeters / 2;
      long secondHalf = distanceMeters - firstHalf;
      addMetersForCountry(grouped, fromCountry, firstHalf);
      addMetersForCountry(grouped, toCountry, secondHalf);
      return;
    }
    String single = fromCountry != null ? fromCountry : toCountry;
    if (single != null) {
      addMetersForCountry(grouped, single, distanceMeters);
    }
  }

  private static String normalizeCountryCode(String country) {
    return StringUtils.hasText(country) ? country.toUpperCase() : null;
  }

  private static void addMetersForCountry(
      Map<String, long[]> grouped, String countryCode, long meters) {
    long[] values = grouped.computeIfAbsent(countryCode, key -> new long[] {0, 0});
    values[0] += meters;
  }

  private static String buildCacheKey(Route route) {
    String source =
        route.getRoutingProfile()
            + "|"
            + route.getRoutingMode()
            + "|"
            + route.getPoints().stream()
                .sorted(Comparator.comparing((@NonNull RoutePoint point) -> point.getPointOrder()))
                .map(point -> point.getLat() + "," + point.getLng())
                .reduce((left, right) -> left + ";" + right)
                .orElse("");
    return sha256(source);
  }

  private static String sha256(String value) {
    try {
      MessageDigest digest = MessageDigest.getInstance("SHA-256");
      byte[] hash = digest.digest(value.getBytes(StandardCharsets.UTF_8));
      StringBuilder out = new StringBuilder(hash.length * 2);
      for (byte b : hash) {
        out.append(String.format("%02x", b));
      }
      return out.toString();
    } catch (Exception ex) {
      throw new IllegalStateException("Failed to hash cache key", ex);
    }
  }
}
