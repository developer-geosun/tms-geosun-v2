package com.geosun.tms.reference.dto.response;

import java.time.Instant;

public record VehicleCombinationDto(
    String id,
    String name,
    String tractorId,
    String tractorPlateNumber,
    String trailerId,
    String trailerPlateNumber,
    boolean deleted,
    Instant deletedAt,
    Instant createdAt,
    Instant updatedAt) {}
