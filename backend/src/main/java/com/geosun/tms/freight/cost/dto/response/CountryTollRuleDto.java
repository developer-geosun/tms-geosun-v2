package com.geosun.tms.freight.cost.dto.response;

import com.geosun.tms.freight.cost.domain.TollType;
import java.math.BigDecimal;

public record CountryTollRuleDto(
    String id,
    String tollTariffSetId,
    String countryCode,
    TollType tollType,
    BigDecimal rate,
    Integer fixedDays,
    boolean isActive,
    String createdAt,
    String updatedAt) {}
