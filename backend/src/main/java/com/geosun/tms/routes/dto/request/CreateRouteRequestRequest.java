package com.geosun.tms.routes.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;

/**
 * Контракт {@code POST /api/v1/route-requests} (Phase 0: фіксація DTO).
 */
public record CreateRouteRequestRequest(
    @NotBlank String routeId,
    String preferredStartDate,
    String comment,
    @Valid CargoDetailsRequest cargo) {}
