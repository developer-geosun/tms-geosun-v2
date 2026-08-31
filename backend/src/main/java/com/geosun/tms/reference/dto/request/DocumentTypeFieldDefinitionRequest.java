package com.geosun.tms.reference.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record DocumentTypeFieldDefinitionRequest(
    @NotBlank @Size(max = 64) String key,
    @NotBlank @Size(max = 128) String nameUk,
    @NotBlank @Size(max = 128) String nameEn,
    @NotBlank @Size(max = 128) String nameRu) {}
