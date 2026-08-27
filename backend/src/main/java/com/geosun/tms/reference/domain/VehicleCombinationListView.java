package com.geosun.tms.reference.domain;

/** Фільтр списку автопоїздів. */
public enum VehicleCombinationListView {
  ACTIVE,
  ALL,
  DELETED;

  public static VehicleCombinationListView fromQueryParam(String raw) {
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
