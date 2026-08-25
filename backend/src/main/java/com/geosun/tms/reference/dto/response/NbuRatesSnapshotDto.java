package com.geosun.tms.reference.dto.response;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record NbuRatesSnapshotDto(LocalDate rateDate, Instant fetchedAt, List<NbuRateDto> rates) {}
