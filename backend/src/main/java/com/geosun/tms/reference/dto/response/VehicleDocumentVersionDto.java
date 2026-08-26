package com.geosun.tms.reference.dto.response;

import com.geosun.tms.reference.domain.VehicleDocumentStatus;
import com.geosun.tms.reference.domain.VehicleDocumentType;
import com.geosun.tms.storage.dto.StoredFileDto;
import java.time.Instant;
import java.time.LocalDate;

/** Одна версія документа ТС. */
public record VehicleDocumentVersionDto(
    String id,
    VehicleDocumentType documentType,
    LocalDate validFrom,
    LocalDate validTo,
    VehicleDocumentStatus status,
    StoredFileDto scan,
    Instant createdAt,
    Instant updatedAt) {}
