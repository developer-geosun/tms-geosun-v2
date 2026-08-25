package com.geosun.tms.routes.dto.response;

import com.geosun.tms.routes.dto.QuoteStatus;

/**
 * Read-модель комерційної пропозиції (quote).
 */
public record QuoteDto(
    String id,
    Long requestId,
    String currency,
    Double totalAmount,
    Integer transitDaysMin,
    Integer transitDaysMax,
    String validUntil,
    QuoteStatus status,
    String publicNote,
    String freightCostCalculationId,
    String createdAt,
    String sentAt) {}
