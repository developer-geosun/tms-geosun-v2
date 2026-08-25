package com.geosun.tms.routes.dto.request;

import com.geosun.tms.routes.dto.RouteRequestStatus;

public record AdminRouteRequestListQuery(
    RouteRequestStatus status,
    String createdFrom,
    String createdTo,
    String ownerEmail,
    String routeTitle,
    String sort,
    String order,
    int page,
    int size) {}
