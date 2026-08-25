package com.geosun.tms.routes.dto.response;

import java.util.List;

/**
 * Повний snapshot маршруту для відкриття з історії.
 */
public record RouteSnapshotDto(
    String id,
    String title,
    String routingProfile,
    String routingMode,
    String routePolyline,
    Double distanceKm,
    Integer durationMin,
    String routeComment,
    String createdAt,
    String updatedAt,
    List<RoutePointDto> points,
    boolean lockedByRequest) {}
