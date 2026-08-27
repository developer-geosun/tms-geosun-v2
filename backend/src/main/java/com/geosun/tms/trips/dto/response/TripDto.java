package com.geosun.tms.trips.dto.response;

import com.geosun.tms.trips.domain.TripStatus;
import java.time.Instant;

public record TripDto(
    String id,
    String tripNumber,
    TripStatus status,
    Long routeRequestId,
    String title,
    String comment,
    String originText,
    String destinationText,
    Instant plannedStartAt,
    Instant plannedEndAt,
    Instant actualStartAt,
    Instant actualEndAt,
    String driverId,
    String driverName,
    String combinationId,
    String tractorId,
    String tractorPlate,
    String trailerId,
    String trailerPlate,
    String expenseReportStatus,
    boolean deleted,
    Instant deletedAt,
    Instant createdAt,
    Instant updatedAt) {}
