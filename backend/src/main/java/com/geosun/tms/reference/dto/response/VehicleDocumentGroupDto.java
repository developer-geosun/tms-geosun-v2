package com.geosun.tms.reference.dto.response;

import com.geosun.tms.reference.domain.VehicleDocumentStatus;
import com.geosun.tms.reference.domain.VehicleDocumentType;
import java.util.List;

/** Група версій одного типу документа: поточна + історія. */
public record VehicleDocumentGroupDto(
    VehicleDocumentType documentType,
    boolean required,
    VehicleDocumentStatus status,
    VehicleDocumentVersionDto current,
    List<VehicleDocumentVersionDto> history) {}
