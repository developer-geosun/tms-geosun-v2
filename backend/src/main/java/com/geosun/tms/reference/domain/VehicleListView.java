package com.geosun.tms.reference.domain;

/** Фільтр списку ТС (GET /admin/vehicles?view=). */
public enum VehicleListView {
  ACTIVE,
  ALL,
  DELETED;

  public static VehicleListView fromQueryParam(String raw) {
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
