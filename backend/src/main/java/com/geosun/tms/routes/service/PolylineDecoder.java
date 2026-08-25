package com.geosun.tms.routes.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
public class PolylineDecoder {
  private static final String CHARSET =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

  private final ObjectMapper objectMapper;

  public PolylineDecoder(ObjectMapper objectMapper) {
    this.objectMapper = objectMapper;
  }

  public List<LatLng> decode(String polyline) {
    if (!StringUtils.hasText(polyline)) {
      return List.of();
    }
    String trimmed = polyline.trim();
    if (trimmed.startsWith("[")) {
      return decodeJsonCoordinates(trimmed);
    }
    DecodeState state = new DecodeState(trimmed);
    long version = state.decodeUnsignedVarInt();
    if (version != 1L) {
      throw new IllegalArgumentException("Unsupported HERE flexible polyline version: " + version);
    }
    long header = state.decodeUnsignedVarInt();
    int precision = (int) (header & 15);
    int thirdDimensionFlag = (int) ((header >> 4) & 7);
    int thirdDimensionPrecision = (int) ((header >> 7) & 15);

    long factor = pow10(precision);
    long thirdFactor = pow10(thirdDimensionPrecision);
    long lastLat = 0L;
    long lastLng = 0L;
    long lastZ = 0L;
    List<LatLng> result = new ArrayList<>();

    while (!state.isAtEnd()) {
      lastLat += state.decodeSignedVarInt();
      lastLng += state.decodeSignedVarInt();
      if (thirdDimensionFlag != 0) {
        lastZ += state.decodeSignedVarInt();
        // Третю координату поки ігноруємо, але читаємо для коректного руху курсора.
        long ignored = lastZ / thirdFactor;
        if (ignored == Long.MIN_VALUE) {
          throw new IllegalStateException("Unexpected decoded third dimension value");
        }
      }
      result.add(new LatLng(lastLat / (double) factor, lastLng / (double) factor));
    }
    return result;
  }

  private List<LatLng> decodeJsonCoordinates(String polylineJson) {
    try {
      JsonNode root = objectMapper.readTree(polylineJson);
      if (!root.isArray()) {
        return List.of();
      }
      List<LatLng> result = new ArrayList<>(root.size());
      for (JsonNode point : root) {
        if (!point.isArray() || point.size() < 2) {
          continue;
        }
        result.add(new LatLng(point.get(0).asDouble(), point.get(1).asDouble()));
      }
      return result;
    } catch (Exception ex) {
      throw new IllegalArgumentException("Invalid JSON polyline format", ex);
    }
  }

  public static String encode(List<LatLng> points) {
    StringBuilder out = new StringBuilder();
    appendUnsignedVarInt(out, 1L);
    appendUnsignedVarInt(out, 5L);
    long lastLat = 0L;
    long lastLng = 0L;
    for (LatLng point : points) {
      long lat = Math.round(point.lat() * 100000.0);
      long lng = Math.round(point.lng() * 100000.0);
      appendSignedVarInt(out, lat - lastLat);
      appendSignedVarInt(out, lng - lastLng);
      lastLat = lat;
      lastLng = lng;
    }
    return out.toString();
  }

  private static void appendSignedVarInt(StringBuilder out, long value) {
    long transformed = value < 0 ? ~(value << 1) : (value << 1);
    appendUnsignedVarInt(out, transformed);
  }

  private static void appendUnsignedVarInt(StringBuilder out, long value) {
    long current = value;
    while (current >= 0x20) {
      int idx = (int) ((current & 0x1F) | 0x20);
      out.append(CHARSET.charAt(idx));
      current >>= 5;
    }
    out.append(CHARSET.charAt((int) current));
  }

  private static long pow10(int precision) {
    long value = 1L;
    for (int i = 0; i < precision; i++) {
      value *= 10L;
    }
    return value;
  }

  public record LatLng(double lat, double lng) {}

  private static final class DecodeState {
    private final String data;
    private int index = 0;

    private DecodeState(String data) {
      this.data = data;
    }

    private boolean isAtEnd() {
      return index >= data.length();
    }

    private long decodeSignedVarInt() {
      long value = decodeUnsignedVarInt();
      return (value & 1L) == 0L ? (value >> 1) : ~(value >> 1);
    }

    private long decodeUnsignedVarInt() {
      long result = 0L;
      int shift = 0;
      int chunks = 0;
      while (true) {
        if (index >= data.length()) {
          throw new IllegalArgumentException("Invalid HERE flexible polyline: unexpected end");
        }
        int raw = decodeChar(data.charAt(index++));
        result |= (long) (raw & 0x1F) << shift;
        chunks++;
        if ((raw & 0x20) == 0) {
          return result;
        }
        shift += 5;
        if (chunks > 12) {
          throw new IllegalArgumentException("Invalid HERE flexible polyline: varint overflow");
        }
      }
    }

    private static int decodeChar(char ch) {
      int idx = CHARSET.indexOf(ch);
      if (idx < 0) {
        throw new IllegalArgumentException("Invalid HERE flexible polyline char: " + ch);
      }
      return idx;
    }
  }
}
