package com.geosun.tms.routes.dto.request;

import jakarta.validation.constraints.DecimalMin;

public record CreateQuoteRequest(
    String currency,
    @DecimalMin(value = "0.01") Double totalAmount,
    Integer transitDaysMin,
    Integer transitDaysMax,
    String validUntil,
    String publicNote,
    String internalNote,
    String fromCostCalculationId,
    Boolean copyCalculationSummaryToInternalNote) {}
