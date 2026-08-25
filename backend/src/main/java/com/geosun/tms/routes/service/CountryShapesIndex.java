package com.geosun.tms.routes.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
public class CountryShapesIndex {
  private static final String SHAPES_RESOURCE = "geo/countries/ne_110m_admin_0_countries.geojson";
  private final ObjectMapper objectMapper;
  private volatile List<CountryShape> shapes = List.of();

  public CountryShapesIndex(ObjectMapper objectMapper) {
    this.objectMapper = objectMapper;
  }

  @PostConstruct
  void load() {
    this.shapes = loadFromResource();
  }

  public String findCountryCode(double lat, double lng) {
    for (CountryShape shape : shapes) {
      if (!shape.contains(lat, lng)) {
        continue;
      }
      return shape.countryCode();
    }
    return null;
  }

  private List<CountryShape> loadFromResource() {
    try {
      ClassPathResource resource = new ClassPathResource(SHAPES_RESOURCE);
      try (InputStream input = resource.getInputStream()) {
        JsonNode root = objectMapper.readTree(input);
        JsonNode features = root.path("features");
        if (!features.isArray()) {
          return List.of();
        }
        List<CountryShape> loaded = new ArrayList<>();
        for (JsonNode feature : features) {
          String countryCode = extractCountryCode(feature.path("properties"));
          if (!StringUtils.hasText(countryCode)) {
            continue;
          }
          JsonNode geometry = feature.path("geometry");
          String type = geometry.path("type").asText("");
          JsonNode coordinates = geometry.path("coordinates");
          if ("Polygon".equals(type)) {
            CountryShape shape = polygonToShape(countryCode, coordinates);
            if (shape != null) {
              loaded.add(shape);
            }
          } else if ("MultiPolygon".equals(type) && coordinates.isArray()) {
            for (JsonNode polygonCoords : coordinates) {
              CountryShape shape = polygonToShape(countryCode, polygonCoords);
              if (shape != null) {
                loaded.add(shape);
              }
            }
          }
        }
        return loaded;
      }
    } catch (Exception ex) {
      throw new IllegalStateException("Failed to load country shapes", ex);
    }
  }

  private static CountryShape polygonToShape(String countryCode, JsonNode polygonCoordinates) {
    if (!polygonCoordinates.isArray() || polygonCoordinates.isEmpty()) {
      return null;
    }
    JsonNode outerRing = polygonCoordinates.get(0);
    if (!outerRing.isArray() || outerRing.size() < 3) {
      return null;
    }
    List<Point> points = new ArrayList<>(outerRing.size());
    double minLat = Double.POSITIVE_INFINITY;
    double maxLat = Double.NEGATIVE_INFINITY;
    double minLng = Double.POSITIVE_INFINITY;
    double maxLng = Double.NEGATIVE_INFINITY;
    for (JsonNode node : outerRing) {
      if (!node.isArray() || node.size() < 2) {
        continue;
      }
      double lng = node.get(0).asDouble();
      double lat = node.get(1).asDouble();
      points.add(new Point(lat, lng));
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
    }
    if (points.size() < 3) {
      return null;
    }
    return new CountryShape(countryCode, points, minLat, maxLat, minLng, maxLng);
  }

  private static String extractCountryCode(JsonNode properties) {
    String isoA2 = properties.path("ISO_A2").asText("").trim();
    if (isoA2.length() == 2 && !"-99".equals(isoA2)) {
      return isoA2.toUpperCase(Locale.ROOT);
    }
    String isoA2Eh = properties.path("ISO_A2_EH").asText("").trim();
    if (isoA2Eh.length() == 2 && !"-99".equals(isoA2Eh)) {
      return isoA2Eh.toUpperCase(Locale.ROOT);
    }
    return null;
  }

  private record Point(double lat, double lng) {}

  private record CountryShape(
      String countryCode,
      List<Point> polygon,
      double minLat,
      double maxLat,
      double minLng,
      double maxLng) {
    private boolean contains(double lat, double lng) {
      if (lat < minLat || lat > maxLat || lng < minLng || lng > maxLng) {
        return false;
      }
      boolean inside = false;
      for (int i = 0, j = polygon.size() - 1; i < polygon.size(); j = i++) {
        Point pi = polygon.get(i);
        Point pj = polygon.get(j);
        boolean intersects =
            ((pi.lat > lat) != (pj.lat > lat))
                && (lng
                    < (pj.lng - pi.lng) * (lat - pi.lat) / ((pj.lat - pi.lat) + 1e-12) + pi.lng);
        if (intersects) {
          inside = !inside;
        }
      }
      return inside;
    }
  }
}
