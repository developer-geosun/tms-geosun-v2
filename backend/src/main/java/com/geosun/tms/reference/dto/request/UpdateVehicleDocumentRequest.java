package com.geosun.tms.reference.dto.request;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

/** Оновлення дат поточної версії документа. */
public record UpdateVehicleDocumentRequest(
    @NotNull LocalDate validFrom, @NotNull LocalDate validTo) {}
