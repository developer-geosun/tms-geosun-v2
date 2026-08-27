package com.geosun.tms.reference.dto.response;

import com.geosun.tms.reference.domain.DriverDocumentStatus;
import com.geosun.tms.reference.domain.DriverDocumentType;
import com.geosun.tms.reference.domain.RegistrationScanSide;
import com.geosun.tms.storage.dto.StoredFileDto;
import java.time.Instant;
import java.time.LocalDate;

public record DriverDocumentVersionDto(
    String id,
    DriverDocumentType documentType,
    RegistrationScanSide side,
    LocalDate validFrom,
    LocalDate validTo,
    DriverDocumentStatus status,
    StoredFileDto file,
    Instant createdAt,
    Instant updatedAt) {}
