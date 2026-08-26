package com.geosun.tms.reference.service;

import com.geosun.tms.auth.exception.ApiException;
import com.geosun.tms.reference.domain.RegistrationScanSide;
import com.geosun.tms.reference.domain.Vehicle;
import com.geosun.tms.reference.domain.VehicleListView;
import com.geosun.tms.reference.domain.VehicleRegistrationScan;
import com.geosun.tms.reference.domain.VehicleType;
import com.geosun.tms.reference.dto.request.CreateVehicleRequest;
import com.geosun.tms.reference.dto.request.UpdateVehicleRequest;
import com.geosun.tms.reference.dto.response.VehicleDto;
import com.geosun.tms.reference.repository.VehicleRegistrationScanRepository;
import com.geosun.tms.reference.repository.VehicleRepository;
import com.geosun.tms.storage.dto.StoredFileDto;
import com.geosun.tms.storage.service.StoredFileService;
import java.time.Instant;
import java.time.Year;
import java.util.EnumMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.regex.Pattern;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class VehicleService {

  private static final Pattern VIN_PATTERN = Pattern.compile("^[A-HJ-NPR-Z0-9]{17}$");

  private final VehicleRepository vehicleRepository;
  private final VehicleRegistrationScanRepository scanRepository;
  private final StoredFileService storedFileService;

  public VehicleService(
      VehicleRepository vehicleRepository,
      VehicleRegistrationScanRepository scanRepository,
      StoredFileService storedFileService) {
    this.vehicleRepository = vehicleRepository;
    this.scanRepository = scanRepository;
    this.storedFileService = storedFileService;
  }

  @Transactional(readOnly = true)
  public List<VehicleDto> list(VehicleListView view) {
    List<Vehicle> vehicles =
        switch (view == null ? VehicleListView.ACTIVE : view) {
          case ACTIVE -> vehicleRepository.findByDeletedFalseOrderByPlateNumberAsc();
          case DELETED -> vehicleRepository.findByDeletedTrueOrderByPlateNumberAsc();
          case ALL -> vehicleRepository.findAllByOrderByPlateNumberAsc();
        };
    return vehicles.stream().map(this::toDto).toList();
  }

  @Transactional(readOnly = true)
  public VehicleDto getById(@NonNull String id) {
    return toDto(requireVehicle(id));
  }

  @Transactional
  public VehicleDto create(@NonNull CreateVehicleRequest request) {
    Vehicle vehicle = new Vehicle();
    applyFields(
        vehicle,
        request.plateNumber(),
        request.vin(),
        request.make(),
        request.model(),
        request.manufactureYear(),
        request.owner(),
        request.registrationSeries(),
        request.registrationNumber(),
        request.vehicleType());
    assertUnique(vehicle, null);
    return toDto(vehicleRepository.save(vehicle));
  }

  @Transactional
  public VehicleDto update(@NonNull String id, @NonNull UpdateVehicleRequest request) {
    Vehicle vehicle = requireVehicle(id);
    if (vehicle.isDeleted()) {
      throw ApiException.conflict("VEHICLE_DELETED", "Cannot update a deleted vehicle");
    }
    applyFields(
        vehicle,
        request.plateNumber(),
        request.vin(),
        request.make(),
        request.model(),
        request.manufactureYear(),
        request.owner(),
        request.registrationSeries(),
        request.registrationNumber(),
        request.vehicleType());
    assertUnique(vehicle, id);
    return toDto(vehicleRepository.save(vehicle));
  }

  @Transactional
  public void softDelete(@NonNull String id) {
    Vehicle vehicle = requireVehicle(id);
    if (vehicle.isDeleted()) {
      return;
    }
    vehicle.setDeleted(true);
    vehicle.setDeletedAt(Instant.now());
    vehicleRepository.save(vehicle);
  }

  @Transactional
  public VehicleDto restore(@NonNull String id) {
    Vehicle vehicle = requireVehicle(id);
    if (!vehicle.isDeleted()) {
      return toDto(vehicle);
    }
    assertUnique(vehicle, id);
    vehicle.setDeleted(false);
    vehicle.setDeletedAt(null);
    return toDto(vehicleRepository.save(vehicle));
  }

  @NonNull
  public Vehicle requireVehicle(@NonNull String id) {
    return Objects.requireNonNull(
        vehicleRepository
            .findById(id)
            .orElseThrow(() -> ApiException.notFound("Vehicle not found")));
  }

  @NonNull
  public Vehicle requireActiveVehicle(@NonNull String id) {
    Vehicle vehicle = requireVehicle(id);
    if (vehicle.isDeleted()) {
      throw ApiException.conflict("VEHICLE_DELETED", "Vehicle is deleted");
    }
    return vehicle;
  }

  private void applyFields(
      Vehicle vehicle,
      String plateNumber,
      String vin,
      String make,
      String model,
      Short manufactureYear,
      String owner,
      String registrationSeries,
      String registrationNumber,
      VehicleType vehicleType) {
    vehicle.setPlateNumber(requireTrimmed(plateNumber, "plateNumber"));
    vehicle.setVin(normalizeVin(vin));
    vehicle.setMake(requireTrimmed(make, "make"));
    vehicle.setModel(requireTrimmed(model, "model"));
    vehicle.setManufactureYear(validateYear(manufactureYear));
    vehicle.setOwner(requireTrimmed(owner, "owner"));
    vehicle.setRegistrationSeries(requireTrimmed(registrationSeries, "registrationSeries"));
    vehicle.setRegistrationNumber(requireTrimmed(registrationNumber, "registrationNumber"));
    if (vehicleType == null) {
      throw ApiException.badRequest("VALIDATION_ERROR", "vehicleType is required");
    }
    vehicle.setVehicleType(vehicleType);
  }

  private void assertUnique(Vehicle vehicle, String excludeId) {
    String plate = vehicle.getPlateNumber();
    String vin = vehicle.getVin();
    String series = vehicle.getRegistrationSeries();
    String number = vehicle.getRegistrationNumber();

    boolean plateConflict =
        excludeId == null
            ? vehicleRepository.existsByPlateNumberIgnoreCaseAndDeletedFalse(plate)
            : vehicleRepository.existsByPlateNumberIgnoreCaseAndDeletedFalseAndIdNot(
                plate, excludeId);
    if (plateConflict) {
      throw ApiException.conflict("PLATE_ALREADY_EXISTS", "Plate number already exists");
    }

    boolean vinConflict =
        excludeId == null
            ? vehicleRepository.existsByVinIgnoreCaseAndDeletedFalse(vin)
            : vehicleRepository.existsByVinIgnoreCaseAndDeletedFalseAndIdNot(vin, excludeId);
    if (vinConflict) {
      throw ApiException.conflict("VIN_ALREADY_EXISTS", "VIN already exists");
    }

    boolean regConflict =
        excludeId == null
            ? vehicleRepository
                .existsByRegistrationSeriesIgnoreCaseAndRegistrationNumberIgnoreCaseAndDeletedFalse(
                    series, number)
            : vehicleRepository
                .existsByRegistrationSeriesIgnoreCaseAndRegistrationNumberIgnoreCaseAndDeletedFalseAndIdNot(
                    series, number, excludeId);
    if (regConflict) {
      throw ApiException.conflict(
          "REGISTRATION_ALREADY_EXISTS", "Registration series/number already exists");
    }
  }

  private VehicleDto toDto(Vehicle vehicle) {
    Map<RegistrationScanSide, StoredFileDto> scans =
        loadScanMap(Objects.requireNonNull(vehicle.getId()));
    return new VehicleDto(
        vehicle.getId(),
        vehicle.getPlateNumber(),
        vehicle.getVin(),
        vehicle.getMake(),
        vehicle.getModel(),
        vehicle.getManufactureYear(),
        vehicle.getOwner(),
        vehicle.getRegistrationSeries(),
        vehicle.getRegistrationNumber(),
        vehicle.getVehicleType(),
        vehicle.isDeleted(),
        vehicle.getDeletedAt(),
        vehicle.getCreatedAt(),
        vehicle.getUpdatedAt(),
        scans.get(RegistrationScanSide.FRONT),
        scans.get(RegistrationScanSide.BACK));
  }

  private Map<RegistrationScanSide, StoredFileDto> loadScanMap(String vehicleId) {
    Map<RegistrationScanSide, StoredFileDto> map = new EnumMap<>(RegistrationScanSide.class);
    for (VehicleRegistrationScan scan :
        scanRepository.findByVehicle_Id(Objects.requireNonNull(vehicleId))) {
      map.put(
          scan.getSide(),
          storedFileService.getDto(Objects.requireNonNull(scan.getStoredFile().getId())));
    }
    return map;
  }

  private static String requireTrimmed(String value, String field) {
    if (!StringUtils.hasText(value)) {
      throw ApiException.badRequest("VALIDATION_ERROR", field + " is required");
    }
    return value.trim();
  }

  private static String normalizeVin(String vin) {
    String normalized = requireTrimmed(vin, "vin").toUpperCase(Locale.ROOT);
    if (!VIN_PATTERN.matcher(normalized).matches()) {
      throw ApiException.badRequest(
          "VALIDATION_ERROR", "VIN must be 17 characters without I, O, Q");
    }
    return normalized;
  }

  private static short validateYear(Short year) {
    if (year == null) {
      throw ApiException.badRequest("VALIDATION_ERROR", "manufactureYear is required");
    }
    int max = Year.now().getValue() + 1;
    if (year < 1950 || year > max) {
      throw ApiException.badRequest(
          "VALIDATION_ERROR", "manufactureYear must be between 1950 and " + max);
    }
    return year;
  }
}
