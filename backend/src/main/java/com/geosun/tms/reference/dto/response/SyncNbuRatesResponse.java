package com.geosun.tms.reference.dto.response;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record SyncNbuRatesResponse(
    LocalDate rateDate, Instant fetchedAt, int syncedCount, List<NbuRateDto> rates) {}
