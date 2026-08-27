package com.geosun.tms.trips.dto.response;

import com.geosun.tms.storage.dto.StoredFileDto;
import com.geosun.tms.trips.domain.TripExpenseCategory;
import com.geosun.tms.trips.domain.TripExpenseReportStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record TripExpenseReportDto(
    String id,
    String tripId,
    TripExpenseReportStatus status,
    Instant submittedAt,
    String submittedByUserId,
    Instant reviewedAt,
    String reviewedByUserId,
    String reviewComment,
    List<TripExpenseLineDto> lines,
    Instant createdAt,
    Instant updatedAt) {

  public record TripExpenseLineDto(
      String id,
      TripExpenseCategory category,
      BigDecimal amount,
      String currencyCode,
      LocalDate expenseDate,
      String description,
      String storedFileId,
      StoredFileDto receipt,
      int sortOrder) {}
}
