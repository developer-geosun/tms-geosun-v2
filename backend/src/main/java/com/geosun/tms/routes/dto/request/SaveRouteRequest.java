package com.geosun.tms.routes.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

/**
 * Контракт {@code POST /api/v1/routes} (Phase 0: фіксація DTO).
 */
public record SaveRouteRequest(
    @NotBlank String title,
    @NotBlank String routingProfile,
    @NotBlank String routingMode,
    @NotBlank String routePolyline,
    Double distanceKm,
    Integer durationMin,
    String routeComment,
    @NotEmpty List<@Valid RoutePointRequest> points,
    @Valid HereRouteMetaRequest hereRouteMeta) {}
