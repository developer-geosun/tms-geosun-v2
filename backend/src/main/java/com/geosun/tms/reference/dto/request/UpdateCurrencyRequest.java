package com.geosun.tms.reference.dto.request;

import jakarta.validation.constraints.NotNull;

public record UpdateCurrencyRequest(@NotNull Boolean isActive, Integer displayOrder) {}
