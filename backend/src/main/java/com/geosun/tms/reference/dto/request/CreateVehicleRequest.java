package com.geosun.tms.reference.dto.request;

import com.geosun.tms.reference.domain.VehicleType;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateVehicleRequest(
    @NotBlank @Size(max = 32) String plateNumber,
    @NotBlank @Size(max = 32) String vin,
    @NotBlank @Size(max = 64) String make,
    @NotBlank @Size(max = 64) String model,
    @NotNull @Min(1950) @Max(2100) Short manufactureYear,
    @NotBlank @Size(max = 255) String owner,
    @NotBlank @Size(max = 16) String registrationSeries,
    @NotBlank @Size(max = 32) String registrationNumber,
    @NotNull VehicleType vehicleType,
    Boolean hasRefrigerator) {}
