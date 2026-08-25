package com.geosun.tms.reference.dto.response;

import java.math.BigDecimal;

public record NbuRateDto(
    String currencyCode, BigDecimal rate, BigDecimal ratePerUnit, int nbuUnits, String special) {}
