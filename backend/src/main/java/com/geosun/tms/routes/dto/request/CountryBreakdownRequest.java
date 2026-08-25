package com.geosun.tms.routes.dto.request;

import jakarta.validation.constraints.NotBlank;

public record CountryBreakdownRequest(@NotBlank String scenarioId) {}
