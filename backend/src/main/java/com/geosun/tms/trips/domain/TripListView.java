package com.geosun.tms.trips.domain;

/** Фільтр списку рейсів. */
public enum TripListView {
  ACTIVE,
  ALL,
  DELETED;

  public static TripListView fromQueryParam(String raw) {
    if (raw == null || raw.isBlank()) {
      return ACTIVE;
    }
    return switch (raw.trim().toLowerCase()) {
      case "all" -> ALL;
      case "deleted" -> DELETED;
      case "active" -> ACTIVE;
      default ->
          throw new IllegalArgumentException(
              "Invalid view; expected active, all, or deleted, got: " + raw);
    };
  }
}
