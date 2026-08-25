package com.geosun.tms.freight.cost.dto.request;

import com.geosun.tms.freight.cost.domain.TollType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record UpdateCountryTollRuleRequest(
    @NotNull TollType tollType,
    @NotNull @DecimalMin("0") BigDecimal rate,
    Integer fixedDays,
    @Size(min = 2, max = 2) String countryCode,
    @NotNull Boolean isActive) {}
