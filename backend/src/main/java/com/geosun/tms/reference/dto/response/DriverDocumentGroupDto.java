package com.geosun.tms.reference.dto.response;

import com.geosun.tms.reference.domain.DriverDocumentStatus;
import com.geosun.tms.reference.domain.DriverDocumentType;
import com.geosun.tms.reference.domain.RegistrationScanSide;
import java.util.List;

public record DriverDocumentGroupDto(
    DriverDocumentType documentType,
    RegistrationScanSide side,
    DriverDocumentStatus status,
    DriverDocumentVersionDto current,
    List<DriverDocumentVersionDto> history) {}
