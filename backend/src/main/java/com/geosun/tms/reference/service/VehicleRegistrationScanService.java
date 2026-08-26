package com.geosun.tms.reference.service;

import com.geosun.tms.auth.exception.ApiException;
import com.geosun.tms.reference.domain.RegistrationScanSide;
import com.geosun.tms.reference.domain.Vehicle;
import com.geosun.tms.reference.domain.VehicleRegistrationScan;
import com.geosun.tms.reference.repository.VehicleRegistrationScanRepository;
import com.geosun.tms.storage.domain.StoredFile;
import com.geosun.tms.storage.dto.StoredFileDto;
import com.geosun.tms.storage.service.StoredFileService;
import com.geosun.tms.storage.service.StoredFileService.OpenedStoredFile;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class VehicleRegistrationScanService {

  private static final Set<String> ALLOWED_CONTENT_TYPES =
      Set.of("image/jpeg", "image/png", "application/pdf");

  private final VehicleService vehicleService;
  private final VehicleRegistrationScanRepository scanRepository;
  private final StoredFileService storedFileService;

  public VehicleRegistrationScanService(
      VehicleService vehicleService,
      VehicleRegistrationScanRepository scanRepository,
      StoredFileService storedFileService) {
    this.vehicleService = vehicleService;
    this.scanRepository = scanRepository;
    this.storedFileService = storedFileService;
  }

  @Transactional
  public StoredFileDto uploadOrReplace(
      @NonNull String vehicleId,
      @NonNull RegistrationScanSide side,
      @NonNull MultipartFile file,
      @NonNull String userId) {
    Vehicle vehicle = vehicleService.requireActiveVehicle(vehicleId);
    validateContentType(file);

    String relativeDir =
        "vehicles/" + vehicleId + "/registration/" + side.name().toLowerCase(Locale.ROOT);
    StoredFileDto stored =
        storedFileService.storeMultipart(file, Objects.requireNonNull(relativeDir), userId);
    StoredFile storedEntity = storedFileService.requireById(Objects.requireNonNull(stored.id()));

    VehicleRegistrationScan existing =
        scanRepository.findByVehicle_IdAndSide(vehicleId, side).orElse(null);
    if (existing != null) {
      String oldFileId = Objects.requireNonNull(existing.getStoredFile().getId());
      existing.setStoredFile(storedEntity);
      scanRepository.save(existing);
      storedFileService.delete(oldFileId);
      return stored;
    }

    VehicleRegistrationScan scan = new VehicleRegistrationScan();
    scan.setVehicle(vehicle);
    scan.setSide(side);
    scan.setStoredFile(storedEntity);
    scanRepository.save(scan);
    return stored;
  }

  @Transactional(readOnly = true)
  @NonNull
  public OpenedStoredFile open(@NonNull String vehicleId, @NonNull RegistrationScanSide side) {
    vehicleService.requireVehicle(vehicleId);
    VehicleRegistrationScan scan =
        scanRepository
            .findByVehicle_IdAndSide(vehicleId, side)
            .orElseThrow(() -> ApiException.notFound("Registration scan not found"));
    return storedFileService.open(Objects.requireNonNull(scan.getStoredFile().getId()));
  }

  @Transactional
  public void delete(@NonNull String vehicleId, @NonNull RegistrationScanSide side) {
    vehicleService.requireActiveVehicle(vehicleId);
    scanRepository
        .findByVehicle_IdAndSide(vehicleId, side)
        .ifPresent(
            scan -> {
              String fileId = Objects.requireNonNull(scan.getStoredFile().getId());
              scanRepository.delete(scan);
              storedFileService.delete(fileId);
            });
  }

  private static void validateContentType(MultipartFile file) {
    String contentType = file.getContentType();
    if (contentType == null
        || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase(Locale.ROOT))) {
      throw ApiException.badRequest(
          "VALIDATION_ERROR", "Allowed content types: image/jpeg, image/png, application/pdf");
    }
  }
}
