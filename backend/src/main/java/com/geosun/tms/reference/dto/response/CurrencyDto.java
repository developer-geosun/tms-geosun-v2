package com.geosun.tms.reference.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;

public record CurrencyDto(
    String code,
    int numericCode,
    String nameUk,
    String nameEn,
    int nbuUnits,
    int minorUnits,
    boolean isActive,
    Integer displayOrder,
    BigDecimal latestNbuRatePerUnit,
    LocalDate latestRateDate) {}
