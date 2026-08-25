package com.geosun.tms.routes.service;

import com.geosun.tms.routes.domain.Route;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
public class GeoJsonCountryBreakdownStrategy {
  private static final Logger log = LoggerFactory.getLogger(GeoJsonCountryBreakdownStrategy.class);
  private static final double EARTH_RADIUS_METERS = 6371008.8;
  private static final double STEP_METERS = 2000.0;

  private final PolylineDecoder polylineDecoder;
  private final CountryShapesIndex countryShapesIndex;
  private final MeterRegistry meterRegistry;

  public GeoJsonCountryBreakdownStrategy(
      PolylineDecoder polylineDecoder,
      CountryShapesIndex countryShapesIndex,
      MeterRegistry meterRegistry) {
    this.polylineDecoder = polylineDecoder;
    this.countryShapesIndex = countryShapesIndex;
    this.meterRegistry = meterRegistry;
  }

  public List<HereRoutingClient.CountryBreakdownRow> calculate(Route route) {
    Timer.Sample sample = Timer.start(meterRegistry);
    meterRegistry.counter("country_breakdown.geojson.calls").increment();
    try {
      if (route == null || !StringUtils.hasText(route.getRoutePolyline())) {
        return List.of();
      }
      List<PolylineDecoder.LatLng> points = polylineDecoder.decode(route.getRoutePolyline());
      if (points.size() < 2) {
        return List.of();
      }
      List<HereRoutingClient.CountryBreakdownRow> rows = calculateBySegments(points);
      sample.stop(meterRegistry.timer("country_breakdown.geojson.duration"));
      return rows;
    } catch (Exception ex) {
      meterRegistry.counter("country_breakdown.geojson.failed").increment();
      log.warn(
          "GeoJSON country breakdown failed for route {}",
          route == null ? null : route.getId(),
          ex);
      sample.stop(meterRegistry.timer("country_breakdown.geojson.duration"));
      return List.of();
    }
  }

  private List<HereRoutingClient.CountryBreakdownRow> calculateBySegments(
      List<PolylineDecoder.LatLng> points) {
    Map<String, long[]> grouped = new LinkedHashMap<>();
    for (int i = 0; i < points.size() - 1; i++) {
      PolylineDecoder.LatLng start = points.get(i);
      PolylineDecoder.LatLng end = points.get(i + 1);
      double segmentMeters = haversineMeters(start, end);
      if (segmentMeters <= 0) {
        continue;
      }
      int steps = Math.max(1, (int) Math.ceil(segmentMeters / STEP_METERS));
      double stepRatio = 1.0 / steps;
      for (int step = 0; step < steps; step++) {
        double startRatio = step * stepRatio;
        double endRatio = (step + 1) * stepRatio;
        PolylineDecoder.LatLng subStart = interpolate(start, end, startRatio);
        PolylineDecoder.LatLng subEnd = interpolate(start, end, endRatio);
        double subMeters = haversineMeters(subStart, subEnd);
        if (subMeters <= 0) {
          continue;
        }
        PolylineDecoder.LatLng middle = interpolate(start, end, (startRatio + endRatio) * 0.5);
        String countryCode = countryShapesIndex.findCountryCode(middle.lat(), middle.lng());
        if (!StringUtils.hasText(countryCode)) {
          continue;
        }
        long[] values = grouped.computeIfAbsent(countryCode, key -> new long[] {0L, 0L});
        values[0] += Math.round(subMeters);
      }
    }
    List<HereRoutingClient.CountryBreakdownRow> rows = new ArrayList<>();
    for (Map.Entry<String, long[]> entry : grouped.entrySet()) {
      if (entry.getValue()[0] <= 0) {
        continue;
      }
      rows.add(
          new HereRoutingClient.CountryBreakdownRow(entry.getKey(), entry.getValue()[0], null));
    }
    return rows;
  }

  private static PolylineDecoder.LatLng interpolate(
      PolylineDecoder.LatLng start, PolylineDecoder.LatLng end, double ratio) {
    return new PolylineDecoder.LatLng(
        start.lat() + (end.lat() - start.lat()) * ratio,
        start.lng() + (end.lng() - start.lng()) * ratio);
  }

  private static double haversineMeters(PolylineDecoder.LatLng start, PolylineDecoder.LatLng end) {
    double dLat = Math.toRadians(end.lat() - start.lat());
    double dLng = Math.toRadians(end.lng() - start.lng());
    double lat1 = Math.toRadians(start.lat());
    double lat2 = Math.toRadians(end.lat());

    double a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2)
            + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return EARTH_RADIUS_METERS * c;
  }
}
