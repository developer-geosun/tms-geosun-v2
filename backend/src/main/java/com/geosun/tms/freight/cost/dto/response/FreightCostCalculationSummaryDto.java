package com.geosun.tms.freight.cost.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/** Внутрішній знімок для текстового звіту та JSON breakdown. */
public record FreightCostCalculationSummaryDto(
    LocalDate calculationDate,
    String scenarioName,
    String proposalCurrency,
    String seasonUsed,
    BigDecimal preRouteEmptyKm,
    BigDecimal lTotalKm,
    BigDecimal lEmptyKm,
    BigDecimal lLoadedKm,
    boolean lengthFallbackUsed,
    LocalDate nbuRateDate,
    BigDecimal eurRatePerUnit,
    BigDecimal usdRatePerUnit,
    BigDecimal proposalRatePerUnit,
    BigDecimal fuelLitersEmpty,
    BigDecimal fuelLitersLoaded,
    BigDecimal fuelCostUah,
    int perDiemDays,
    BigDecimal perDiemEur,
    BigDecimal perDiemUah,
    List<TollCountryLineDto> tollLines,
    BigDecimal tollsUah,
    BigDecimal directCostUah,
    BigDecimal driverSalaryPercent,
    BigDecimal driverCostUah,
    BigDecimal costBeforeMarginUah,
    BigDecimal marginPercent,
    BigDecimal marginUah,
    BigDecimal totalUah,
    BigDecimal totalProposalAmount) {}
