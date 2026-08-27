package com.geosun.tms.reference.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateVehicleCombinationRequest(
    @Size(max = 128) String name, @NotBlank String tractorId, @NotBlank String trailerId) {}
