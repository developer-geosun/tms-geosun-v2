package com.geosun.tms.trips.dto.request;

import com.geosun.tms.trips.domain.TripStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateTripStatusRequest(@NotNull TripStatus status) {}
