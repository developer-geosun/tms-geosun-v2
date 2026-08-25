package com.geosun.tms.routes.dto.response;

import com.geosun.tms.routes.dto.RouteRequestStatus;
import java.util.List;

/**
 * Read-модель запиту на фрахт для user/admin сценаріїв.
 */
public record RouteRequestDto(
    Long id,
    String routeId,
    RouteRequestStatus status,
    String preferredStartDate,
    String comment,
    /** Email користувача, який створив запит на розрахунок. */
    String requesterEmail,
    String createdAt,
    String updatedAt,
    RouteSnapshotDto route,
    List<CountryDistanceDto> countryDistances,
    QuoteDto currentQuote) {}
