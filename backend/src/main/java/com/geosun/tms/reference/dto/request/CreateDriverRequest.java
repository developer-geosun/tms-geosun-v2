package com.geosun.tms.reference.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public record CreateDriverRequest(
    @NotBlank @Size(max = 128) String lastName,
    @NotBlank @Size(max = 128) String firstName,
    @Size(max = 128) String patronymic,
    @NotBlank @Size(max = 32) String phone,
    @NotBlank @Size(max = 64) String licenseNumber,
    @NotBlank @Size(max = 64) String licenseCategories,
    @NotNull LocalDate licenseExpiresOn,
    @Size(max = 1000) String comment) {}
