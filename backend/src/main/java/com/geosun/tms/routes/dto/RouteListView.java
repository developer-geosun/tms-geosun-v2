package com.geosun.tms.routes.dto;

/** Фільтр списку маршрутів користувача (GET /routes/my?view=). */
public enum RouteListView {
  ACTIVE,
  ALL,
  DELETED;

  public static RouteListView fromQueryParam(String raw) {
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
