package com.geosun.tms.reference.service;

import com.geosun.tms.auth.exception.ApiException;
import com.geosun.tms.reference.domain.Driver;
import com.geosun.tms.reference.domain.DriverDocument;
import com.geosun.tms.reference.domain.DriverDocumentStatus;
import com.geosun.tms.reference.domain.DriverDocumentType;
import com.geosun.tms.reference.domain.RegistrationScanSide;
import com.geosun.tms.reference.dto.response.DriverDocumentGroupDto;
import com.geosun.tms.reference.dto.response.DriverDocumentVersionDto;
import com.geosun.tms.reference.dto.response.DriverDocumentsResponse;
import com.geosun.tms.reference.repository.DriverDocumentRepository;
import com.geosun.tms.storage.domain.StoredFile;
import com.geosun.tms.storage.dto.StoredFileDto;
import com.geosun.tms.storage.service.StoredFileService;
import com.geosun.tms.storage.service.StoredFileService.OpenedStoredFile;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class DriverDocumentService {

  private static final Set<String> ALLOWED_CONTENT_TYPES =
      Set.of("image/jpeg", "image/png", "application/pdf");

  private final DriverService driverService;
  private final DriverDocumentRepository documentRepository;
  private final StoredFileService storedFileService;

  public DriverDocumentService(
      DriverService driverService,
      DriverDocumentRepository documentRepository,
      StoredFileService storedFileService) {
    this.driverService = driverService;
    this.documentRepository = documentRepository;
    this.storedFileService = storedFileService;
  }

  @Transactional(readOnly = true)
  public DriverDocumentsResponse listDocuments(@NonNull String driverId) {
    driverService.requireDriver(driverId);
    List<DriverDocument> all =
        documentRepository.findByDriver_IdOrderByDocumentTypeAscSideAscCreatedAtDesc(driverId);
    return new DriverDocumentsResponse(buildGroups(all, LocalDate.now()));
  }

  @Transactional
  public DriverDocumentVersionDto addVersion(
      @NonNull String driverId,
      @NonNull DriverDocumentType type,
      @NonNull RegistrationScanSide side,
      @NonNull LocalDate validFrom,
      @NonNull LocalDate validTo,
      @NonNull MultipartFile file,
      @NonNull String userId) {
    Driver driver = driverService.requireActiveDriver(driverId);
    validateDates(validFrom, validTo);
    validateContentType(file);

    String relativeDir =
        "drivers/"
            + driverId
            + "/documents/"
            + type.name().toLowerCase(Locale.ROOT)
            + "/"
            + side.name().toLowerCase(Locale.ROOT);
    StoredFileDto stored =
        storedFileService.storeMultipart(file, Objects.requireNonNull(relativeDir), userId);
    StoredFile storedEntity = storedFileService.requireById(Objects.requireNonNull(stored.id()));

    DriverDocument doc = new DriverDocument();
    doc.setDriver(driver);
    doc.setDocumentType(type);
    doc.setSide(side);
    doc.setValidFrom(validFrom);
    doc.setValidTo(validTo);
    doc.setStoredFile(storedEntity);
    DriverDocument saved = documentRepository.save(doc);
    if (type == DriverDocumentType.DRIVER_LICENSE) {
      driverService.syncLicenseExpiresOnFromDocuments(driverId);
    }
    return toVersionDto(Objects.requireNonNull(saved), LocalDate.now());
  }

  @Transactional(readOnly = true)
  @NonNull
  public OpenedStoredFile openFile(@NonNull String driverId, @NonNull String documentId) {
    driverService.requireDriver(driverId);
    DriverDocument doc = requireDocumentForDriver(driverId, documentId);
    return storedFileService.open(
        Objects.requireNonNull(Objects.requireNonNull(doc.getStoredFile()).getId()));
  }

  @Transactional
  public void deleteVersion(@NonNull String driverId, @NonNull String documentId) {
    driverService.requireActiveDriver(driverId);
    DriverDocument doc = requireDocumentForDriver(driverId, documentId);
    String fileId = Objects.requireNonNull(Objects.requireNonNull(doc.getStoredFile()).getId());
    documentRepository.delete(doc);
    storedFileService.delete(fileId);
  }

  private List<DriverDocumentGroupDto> buildGroups(List<DriverDocument> all, LocalDate today) {
    List<DriverDocumentGroupDto> groups = new ArrayList<>();
    for (DriverDocumentRules.DocumentSlot slot : DriverDocumentRules.requiredSlots()) {
      List<DriverDocument> versions =
          all.stream()
              .filter(
                  d ->
                      Objects.requireNonNull(d).getDocumentType() == slot.type()
                          && d.getSide() == slot.side())
              .toList();
      DriverDocumentVersionDto current =
          versions.isEmpty() ? null : toVersionDto(Objects.requireNonNull(versions.get(0)), today);
      List<DriverDocumentVersionDto> history =
          versions.stream()
              .skip(1)
              .map(d -> toVersionDto(Objects.requireNonNull(d), today))
              .toList();
      DriverDocumentStatus status =
          current == null
              ? DriverDocumentStatus.MISSING
              : DriverDocumentRules.statusOf(current.validTo(), Objects.requireNonNull(today));
      groups.add(
          new DriverDocumentGroupDto(
              Objects.requireNonNull(slot.type()),
              Objects.requireNonNull(slot.side()),
              status,
              current,
              history));
    }
    return groups;
  }

  @NonNull
  private DriverDocument requireDocumentForDriver(
      @NonNull String driverId, @NonNull String documentId) {
    return Objects.requireNonNull(
        documentRepository
            .findByIdAndDriver_Id(documentId, driverId)
            .orElseThrow(() -> ApiException.notFound("Driver document not found")));
  }

  private void validateDates(@NonNull LocalDate validFrom, @NonNull LocalDate validTo) {
    if (validTo.isBefore(validFrom)) {
      throw ApiException.badRequest("VALIDATION_ERROR", "validTo must be on or after validFrom");
    }
  }

  private void validateContentType(@NonNull MultipartFile file) {
    String contentType = file.getContentType();
    if (contentType == null
        || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase(Locale.ROOT))) {
      throw ApiException.badRequest(
          "VALIDATION_ERROR", "Allowed file types: image/jpeg, image/png, application/pdf");
    }
  }

  private DriverDocumentVersionDto toVersionDto(DriverDocument doc, LocalDate today) {
    StoredFileDto fileDto =
        storedFileService.getDto(
            Objects.requireNonNull(Objects.requireNonNull(doc.getStoredFile()).getId()));
    return new DriverDocumentVersionDto(
        Objects.requireNonNull(doc.getId()),
        Objects.requireNonNull(doc.getDocumentType()),
        Objects.requireNonNull(doc.getSide()),
        Objects.requireNonNull(doc.getValidFrom()),
        Objects.requireNonNull(doc.getValidTo()),
        DriverDocumentRules.statusOf(doc.getValidTo(), Objects.requireNonNull(today)),
        fileDto,
        doc.getCreatedAt(),
        doc.getUpdatedAt());
  }
}
