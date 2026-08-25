package com.geosun.tms.freight.cost.dto.request;

import com.geosun.tms.freight.cost.domain.MarginType;
import com.geosun.tms.freight.cost.domain.SeasonMode;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record CreateFreightNumericScenarioRequest(
    @NotBlank @Size(max = 128) String name,
    @Size(max = 4000) String description,
    Boolean isActive,
    @NotNull @DecimalMin("0") BigDecimal fuelConsumptionEmptyLPer100km,
    @NotNull @DecimalMin("0") BigDecimal fuelConsumptionLoadedNonWinterLPer100km,
    @NotNull @DecimalMin("0") BigDecimal fuelConsumptionLoadedWinterLPer100km,
    @NotNull SeasonMode seasonMode,
    @NotNull @DecimalMin("0") BigDecimal fuelPricePerLiter,
    @NotNull @DecimalMin("0") BigDecimal driverSalaryPercentOfFreight,
    @NotNull @DecimalMin("0") BigDecimal perDiemAmountPerDay,
    @NotNull Integer perDiemRouteDivisorKm,
    @NotNull Integer perDiemFixedExtraDays,
    @NotNull MarginType marginType,
    BigDecimal marginPercent,
    BigDecimal marginFixedAmount,
    @NotBlank @Size(min = 3, max = 3) String proposalCurrency,
    @NotBlank String tollTariffSetId) {}
