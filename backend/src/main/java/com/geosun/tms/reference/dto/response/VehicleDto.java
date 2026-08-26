package com.geosun.tms.reference.dto.response;

import com.geosun.tms.reference.domain.VehicleDocumentCompliance;
import com.geosun.tms.reference.domain.VehicleType;
import com.geosun.tms.storage.dto.StoredFileDto;
import java.time.Instant;

public record VehicleDto(
    String id,
    String plateNumber,
    String vin,
    String make,
    String model,
    short manufactureYear,
    String owner,
    String registrationSeries,
    String registrationNumber,
    VehicleType vehicleType,
    boolean hasRefrigerator,
    VehicleDocumentCompliance documentCompliance,
    boolean deleted,
    Instant deletedAt,
    Instant createdAt,
    Instant updatedAt,
    StoredFileDto scanFront,
    StoredFileDto scanBack) {}
