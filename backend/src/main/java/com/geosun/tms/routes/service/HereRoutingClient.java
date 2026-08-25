package com.geosun.tms.routes.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.geosun.tms.routes.config.HereProperties;
import com.geosun.tms.routes.domain.Route;
import com.geosun.tms.routes.domain.RoutePoint;
import java.net.URI;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.ResponseEntity;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

@Component
public class HereRoutingClient {
  private final HereProperties properties;
  private final ObjectMapper objectMapper;
  private final RestTemplate restTemplate;

  public HereRoutingClient(
      HereProperties properties,
      ObjectMapper objectMapper,
      RestTemplateBuilder restTemplateBuilder) {
    this.properties = properties;
    this.objectMapper = objectMapper;
    this.restTemplate =
        restTemplateBuilder
            .setConnectTimeout(Duration.ofMillis(Math.max(500, properties.timeoutMillis())))
            .setReadTimeout(Duration.ofMillis(Math.max(500, properties.timeoutMillis())))
            .build();
  }

  public String fetchCountryBreakdownRaw(Route route) {
    if (!StringUtils.hasText(properties.apiKey())) {
      throw new IllegalStateException("HERE api key is not configured");
    }
    List<RoutePoint> points = sortedPoints(route);
    if (points.size() < 2) {
      throw new IllegalArgumentException("Route must contain at least two points");
    }
    String origin = latLng(points.get(0));
    String destination = latLng(points.get(points.size() - 1));

    UriComponentsBuilder uriBuilder =
        UriComponentsBuilder.fromUriString(properties.baseUrl() + "/v8/routes")
            .queryParam("transportMode", properties.transportMode())
            .queryParam("routingMode", properties.routingMode())
            .queryParam("origin", origin)
            .queryParam("destination", destination)
            .queryParam("return", "summary,polyline")
            .queryParam("spans", "countryCode,length,duration")
            .queryParam("apikey", properties.apiKey());

    for (int i = 1; i < points.size() - 1; i++) {
      uriBuilder.queryParam("via", latLng(points.get(i)));
    }

    URI uri = uriBuilder.build(true).toUri();
    ResponseEntity<String> response = restTemplate.getForEntity(uri, String.class);
    String body = response.getBody();
    if (!StringUtils.hasText(body)) {
      throw new IllegalStateException("HERE response body is empty");
    }
    return body;
  }

  public List<CountryBreakdownRow> parseCountryBreakdown(String rawJson) {
    try {
      JsonNode root = objectMapper.readTree(rawJson);
      List<CountryBreakdownRow> rows = new ArrayList<>();
      JsonNode routes = root.path("routes");
      if (!routes.isArray() || routes.isEmpty()) {
        return rows;
      }
      JsonNode sections = routes.get(0).path("sections");
      if (!sections.isArray()) {
        return rows;
      }
      for (JsonNode section : sections) {
        JsonNode spans = section.path("spans");
        if (!spans.isArray()) {
          continue;
        }
        for (JsonNode span : spans) {
          String countryCode = span.path("countryCode").asText("");
          if (!StringUtils.hasText(countryCode)) {
            continue;
          }
          long length = readSpanLengthMeters(span);
          Long durationSeconds = readSpanDurationSecondsNullable(span);
          rows.add(new CountryBreakdownRow(countryCode.toUpperCase(), length, durationSeconds));
        }
      }
      return rows;
    } catch (Exception ex) {
      throw new IllegalStateException("Failed to parse HERE routing response", ex);
    }
  }

  private static List<RoutePoint> sortedPoints(Route route) {
    return route.getPoints().stream()
        .sorted(Comparator.comparing((@NonNull RoutePoint point) -> point.getPointOrder()))
        .toList();
  }

  private static String latLng(RoutePoint point) {
    return point.getLat() + "," + point.getLng();
  }

  /** Довжина span у метрах: у відповіді v8 може бути число або об'єкт Distance. */
  private static long readSpanLengthMeters(JsonNode span) {
    JsonNode length = span.get("length");
    if (length == null || length.isNull()) {
      return 0L;
    }
    if (length.isNumber()) {
      return length.asLong(0);
    }
    if (length.isObject()) {
      long value = length.path("value").asLong(0);
      String unit = length.path("unit").asText("m");
      if ("km".equalsIgnoreCase(unit) || "kilometers".equalsIgnoreCase(unit)) {
        return Math.round(value * 1000.0);
      }
      return value;
    }
    return 0L;
  }

  /** Тривалість span у секундах, якщо є в відповіді. */
  private static Long readSpanDurationSecondsNullable(JsonNode span) {
    JsonNode duration = span.get("duration");
    if (duration == null || duration.isNull()) {
      return null;
    }
    if (duration.isNumber()) {
      long v = duration.asLong(0);
      return v > 0 ? v : null;
    }
    if (duration.isObject()) {
      long v = duration.path("value").asLong(0);
      return v > 0 ? v : null;
    }
    return null;
  }

  public record CountryBreakdownRow(
      String countryCode, long distanceMeters, Long durationSeconds) {}
}
