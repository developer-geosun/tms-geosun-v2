package com.geosun.tms.reference.dto.response;

import java.time.Instant;
import java.util.List;

public record DocumentTypeReferenceDto(
    String id,
    String nameUk,
    String nameEn,
    String nameRu,
    String countryCode,
    int plannedScanPages,
    List<DocumentTypeFieldDefinitionDto> fieldDefinitions,
    boolean deleted,
    Instant deletedAt,
    Instant createdAt,
    Instant updatedAt) {}
