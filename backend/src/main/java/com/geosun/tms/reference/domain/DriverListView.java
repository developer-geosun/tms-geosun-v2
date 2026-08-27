package com.geosun.tms.reference.domain;

/** Фільтр списку водіїв (GET /admin/drivers?view=). */
public enum DriverListView {
  ACTIVE,
  ALL,
  DELETED;

  public static DriverListView fromQueryParam(String raw) {
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
