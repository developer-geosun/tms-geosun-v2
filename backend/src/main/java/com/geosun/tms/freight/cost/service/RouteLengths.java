package com.geosun.tms.freight.cost.service;

import java.math.BigDecimal;

public record RouteLengths(
    BigDecimal totalKm,
    BigDecimal emptyKm,
    BigDecimal loadedKm,
    BigDecimal preRouteEmptyKm,
    boolean fallbackUsed) {}
