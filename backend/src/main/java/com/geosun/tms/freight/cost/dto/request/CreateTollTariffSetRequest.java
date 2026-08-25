package com.geosun.tms.freight.cost.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateTollTariffSetRequest(
    @NotBlank @Size(max = 128) String name,
    @Size(max = 4000) String description,
    Boolean isActive) {}
