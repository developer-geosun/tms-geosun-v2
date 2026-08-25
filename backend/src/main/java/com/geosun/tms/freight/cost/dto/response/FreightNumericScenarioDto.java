package com.geosun.tms.freight.cost.dto.response;

import com.geosun.tms.freight.cost.domain.MarginType;
import com.geosun.tms.freight.cost.domain.SeasonMode;
import java.math.BigDecimal;

public record FreightNumericScenarioDto(
    String id,
    String name,
    String description,
    boolean isActive,
    BigDecimal fuelConsumptionEmptyLPer100km,
    BigDecimal fuelConsumptionLoadedNonWinterLPer100km,
    BigDecimal fuelConsumptionLoadedWinterLPer100km,
    SeasonMode seasonMode,
    BigDecimal fuelPricePerLiter,
    BigDecimal driverSalaryPercentOfFreight,
    BigDecimal perDiemAmountPerDay,
    int perDiemRouteDivisorKm,
    int perDiemFixedExtraDays,
    MarginType marginType,
    BigDecimal marginPercent,
    BigDecimal marginFixedAmount,
    String proposalCurrency,
    String tollTariffSetId,
    String tollTariffSetName,
    String createdAt,
    String updatedAt) {}
