package com.geosun.tms.routes.dto.response;

/**
 * Протяжність і тривалість маршруту в межах окремої країни.
 *
 * @param alongRouteOrder порядок появи країни уздовж маршруту (0 = перша країна).
 */
public record CountryDistanceDto(
    String countryCode, Long distanceMeters, Long durationSeconds, Integer alongRouteOrder) {}
