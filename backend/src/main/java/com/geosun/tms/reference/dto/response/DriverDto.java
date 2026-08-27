package com.geosun.tms.reference.dto.response;

import com.geosun.tms.reference.domain.DriverDocumentCompliance;
import java.time.Instant;
import java.time.LocalDate;

public record DriverDto(
    String id,
    String lastName,
    String firstName,
    String patronymic,
    String phone,
    String licenseNumber,
    String licenseCategories,
    LocalDate licenseExpiresOn,
    String userId,
    String userEmail,
    String comment,
    DriverDocumentCompliance documentCompliance,
    boolean deleted,
    Instant deletedAt,
    Instant createdAt,
    Instant updatedAt) {}
