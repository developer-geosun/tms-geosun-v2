package com.geosun.tms.routes.dto.request;

import com.geosun.tms.routes.dto.RoutePointOperationDto;
import com.geosun.tms.routes.dto.RoutePointType;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.util.List;

/** Точка маршруту у запиті збереження snapshot. */
public record RoutePointRequest(
    @NotNull @Positive Integer order,
    @NotNull RoutePointType type,
    @NotBlank String address,
    @NotNull @DecimalMin("-90.0") @DecimalMax("90.0") Double lat,
    @NotNull @DecimalMin("-180.0") @DecimalMax("180.0") Double lng,
    String country,
    @NotNull Boolean isBorder,
    Double segmentDistanceKmToNext,
    @Size(max = 3) List<RoutePointOperationDto> operations) {}
