package com.geosun.tms.routes.dto.response;

import com.geosun.tms.routes.dto.RoutePointOperationDto;
import com.geosun.tms.routes.dto.RoutePointType;
import java.util.List;

/** DTO точки маршруту для read-відповідей. */
public record RoutePointDto(
    Integer order,
    RoutePointType type,
    String address,
    Double lat,
    Double lng,
    String country,
    Boolean isBorder,
    Double segmentDistanceKmToNext,
    List<RoutePointOperationDto> operations) {}
