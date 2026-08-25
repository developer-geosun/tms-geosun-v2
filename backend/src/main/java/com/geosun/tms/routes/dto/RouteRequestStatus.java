package com.geosun.tms.routes.dto;

/**
 * Статуси запиту на фрахт.
 */
public enum RouteRequestStatus {
  NEW,
  IN_REVIEW,
  QUOTED,
  ACCEPTED,
  REJECTED,
  CANCELLED,
  EXPIRED
}
