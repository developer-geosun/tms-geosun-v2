package com.geosun.tms.trips.dto.request;

import jakarta.validation.constraints.Size;
import java.time.Instant;

public record UpdateTripRequest(
    Long routeRequestId,
    @Size(max = 255) String title,
    @Size(max = 2000) String comment,
    @Size(max = 512) String originText,
    @Size(max = 512) String destinationText,
    Instant plannedStartAt,
    Instant plannedEndAt,
    String driverId,
    String combinationId,
    String tractorId,
    String trailerId) {}
