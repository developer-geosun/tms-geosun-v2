package com.geosun.tms.freight.cost.dto.request;

import com.geosun.tms.freight.cost.domain.SeasonMode;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public record CostPreviewRequest(
    @NotBlank String scenarioId,
    @NotNull LocalDate calculationDate,
    SeasonMode seasonOverride,
    @Valid StartPointRequest startPoint) {

  public record StartPointRequest(
      @DecimalMin(value = "-90.0") @DecimalMax(value = "90.0") Double lat,
      @DecimalMin(value = "-180.0") @DecimalMax(value = "180.0") Double lng,
      String address) {}
}
