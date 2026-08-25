package com.geosun.tms.freight.cost.dto.response;

import com.fasterxml.jackson.databind.JsonNode;
import java.math.BigDecimal;
import java.time.LocalDate;

public record FreightCostCalculationDto(
    String id,
    Long routeRequestId,
    String scenarioId,
    String scenarioName,
    LocalDate calculationDate,
    String seasonUsed,
    BigDecimal lTotalKm,
    BigDecimal lEmptyKm,
    BigDecimal lLoadedKm,
    BigDecimal directCostUah,
    BigDecimal driverCostUah,
    BigDecimal costBeforeMarginUah,
    BigDecimal marginUah,
    BigDecimal totalUah,
    BigDecimal totalProposalAmount,
    String proposalCurrency,
    JsonNode breakdown,
    String calculationSummary,
    String createdAt) {}
