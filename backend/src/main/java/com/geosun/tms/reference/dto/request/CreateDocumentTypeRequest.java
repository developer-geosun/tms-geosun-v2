package com.geosun.tms.reference.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record CreateDocumentTypeRequest(
    @NotBlank @Size(max = 128) String nameUk,
    @NotBlank @Size(max = 128) String nameEn,
    @NotBlank @Size(max = 128) String nameRu,
    @NotBlank @Size(min = 2, max = 2) String countryCode,
    @NotNull @Min(0) Integer plannedScanPages,
    @NotNull @Valid List<DocumentTypeFieldDefinitionRequest> fieldDefinitions) {}
