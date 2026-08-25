package com.geosun.tms.routes.dto.response;

/**
 * Коротка картка маршруту для списків.
 */
public record RouteSummaryDto(
    String id,
    String title,
    Double distanceKm,
    Integer durationMin,
    Integer pointsCount,
    String createdAt,
    String updatedAt,
    String lastOpenedAt,
    boolean lockedByRequest,
    boolean deleted) {}
