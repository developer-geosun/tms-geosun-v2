package com.geosun.tms.trips.dto.request;

import com.geosun.tms.trips.domain.TripExpenseCategory;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record ReplaceTripExpenseLinesRequest(@NotNull @Valid List<TripExpenseLineInput> lines) {

  public record TripExpenseLineInput(
      String id,
      @NotNull TripExpenseCategory category,
      @NotNull @DecimalMin("0.01") BigDecimal amount,
      @NotNull @Size(min = 3, max = 3) String currencyCode,
      @NotNull LocalDate expenseDate,
      @Size(max = 1000) String description) {}
}
