package com.geosun.tms.freight.cost.dto.response;

import com.geosun.tms.freight.cost.domain.TollType;
import java.math.BigDecimal;

public record TollCountryLineDto(
    String countryCode,
    BigDecimal distanceKm,
    TollType tollType,
    BigDecimal rate,
    Integer fixedDays,
    BigDecimal amountEur,
    BigDecimal amountUah,
    boolean defaultEuFallback) {}
