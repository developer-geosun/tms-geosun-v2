package com.geosun.tms.reference.service;

import com.geosun.tms.auth.exception.ApiException;
import com.geosun.tms.reference.domain.Vehicle;
import com.geosun.tms.reference.domain.VehicleDocument;
import com.geosun.tms.reference.domain.VehicleDocumentStatus;
import com.geosun.tms.reference.domain.VehicleDocumentType;
import com.geosun.tms.reference.dto.request.UpdateVehicleDocumentRequest;
import com.geosun.tms.reference.dto.response.VehicleDocumentGroupDto;
import com.geosun.tms.reference.dto.response.VehicleDocumentVersionDto;
import com.geosun.tms.reference.dto.response.VehicleDocumentsResponse;
import com.geosun.tms.reference.repository.VehicleDocumentRepository;
import com.geosun.tms.storage.domain.StoredFile;
import com.geosun.tms.storage.dto.StoredFileDto;
import com.geosun.tms.storage.service.StoredFileService;
import com.geosun.tms.storage.service.StoredFileService.OpenedStoredFile;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import org.springframework.lang.NonNull;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class VehicleDocumentService {

  private static final Set<String> ALLOWED_CONTENT_TYPES =
      Set.of("image/jpeg", "image/png", "application/pdf");

  private final VehicleService vehicleService;
  private final VehicleDocumentRepository documentRepository;
  private final StoredFileService storedFileService;

  public VehicleDocumentService(
      VehicleService vehicleService,
      VehicleDocumentRepository documentRepository,
      StoredFileService storedFileService) {
    this.vehicleService = vehicleService;
    this.documentRepository = documentRepository;
    this.storedFileService = storedFileService;
  }

  @Transactional(readOnly = true)
  public VehicleDocumentsResponse listDocuments(@NonNull String vehicleId) {
    Vehicle vehicle = vehicleService.requireVehicle(vehicleId);
    List<VehicleDocument> all =
        documentRepository.findByVehicle_IdOrderByDocumentTypeAscCreatedAtDesc(vehicleId);
    return new VehicleDocumentsResponse(buildGroups(vehicle, all, LocalDate.now()));
  }

  @Transactional
  public VehicleDocumentVersionDto addVersion(
      @NonNull String vehicleId,
      @NonNull VehicleDocumentType type,
      @NonNull LocalDate validFrom,
      @NonNull LocalDate validTo,
      @NonNull MultipartFile file,
      @NonNull String userId) {
    Vehicle vehicle = vehicleService.requireActiveVehicle(vehicleId);
    assertTypeAllowed(vehicle, type);
    validateDates(validFrom, validTo);
    validateContentType(file);

    String relativeDir =
        "vehicles/" + vehicleId + "/documents/" + type.name().toLowerCase(Locale.ROOT);
    StoredFileDto stored =
        storedFileService.storeMultipart(file, Objects.requireNonNull(relativeDir), userId);
    StoredFile storedEntity = storedFileService.requireById(Objects.requireNonNull(stored.id()));

    VehicleDocument doc = new VehicleDocument();
    doc.setVehicle(vehicle);
    doc.setDocumentType(type);
    doc.setValidFrom(validFrom);
    doc.setValidTo(validTo);
    doc.setStoredFile(storedEntity);
    VehicleDocument saved = documentRepository.save(doc);
    return toVersionDto(saved, LocalDate.now());
  }

  @Transactional
  public VehicleDocumentVersionDto patchCurrent(
      @NonNull String vehicleId,
      @NonNull String documentId,
      @Nullable UpdateVehicleDocumentRequest dates,
      @Nullable MultipartFile file,
      @NonNull String userId) {
    vehicleService.requireActiveVehicle(vehicleId);
    VehicleDocument doc = requireDocumentForVehicle(vehicleId, documentId);
    VehicleDocument current =
        requireCurrentVersion(vehicleId, Objects.requireNonNull(doc.getDocumentType()));
    if (!Objects.equals(current.getId(), doc.getId())) {
      throw ApiException.conflict(
          "DOCUMENT_NOT_CURRENT", "Only the current document version can be updated");
    }
    if (dates == null && (file == null || file.isEmpty())) {
      throw ApiException.badRequest(
          "VALIDATION_ERROR", "At least dates or file must be provided for update");
    }

    if (dates != null) {
      validateDates(dates.validFrom(), dates.validTo());
      doc.setValidFrom(dates.validFrom());
      doc.setValidTo(dates.validTo());
    }

    if (file != null && !file.isEmpty()) {
      validateContentType(file);
      String relativeDir =
          "vehicles/"
              + vehicleId
              + "/documents/"
              + doc.getDocumentType().name().toLowerCase(Locale.ROOT);
      StoredFileDto stored =
          storedFileService.storeMultipart(file, Objects.requireNonNull(relativeDir), userId);
      StoredFile storedEntity = storedFileService.requireById(Objects.requireNonNull(stored.id()));
      String oldFileId = Objects.requireNonNull(doc.getStoredFile().getId());
      doc.setStoredFile(storedEntity);
      documentRepository.save(doc);
      storedFileService.delete(oldFileId);
    } else {
      documentRepository.save(doc);
    }

    return toVersionDto(doc, LocalDate.now());
  }

  @Transactional(readOnly = true)
  @NonNull
  public OpenedStoredFile openScan(@NonNull String vehicleId, @NonNull String documentId) {
    vehicleService.requireVehicle(vehicleId);
    VehicleDocument doc = requireDocumentForVehicle(vehicleId, documentId);
    return storedFileService.open(Objects.requireNonNull(doc.getStoredFile().getId()));
  }

  @Transactional
  public void deleteVersion(@NonNull String vehicleId, @NonNull String documentId) {
    vehicleService.requireActiveVehicle(vehicleId);
    VehicleDocument doc = requireDocumentForVehicle(vehicleId, documentId);
    String fileId = Objects.requireNonNull(doc.getStoredFile().getId());
    documentRepository.delete(doc);
    storedFileService.delete(fileId);
  }

  @NonNull
  private List<VehicleDocumentGroupDto> buildGroups(
      Vehicle vehicle, List<VehicleDocument> allDocs, LocalDate today) {
    Set<VehicleDocumentType> required =
        VehicleDocumentRules.requiredTypes(
            Objects.requireNonNull(vehicle.getVehicleType()), vehicle.isHasRefrigerator());
    Map<VehicleDocumentType, List<VehicleDocument>> byType =
        new EnumMap<>(VehicleDocumentType.class);
    for (VehicleDocument doc : allDocs) {
      byType.computeIfAbsent(doc.getDocumentType(), k -> new ArrayList<>()).add(doc);
    }

    List<VehicleDocumentGroupDto> groups = new ArrayList<>();
    for (VehicleDocumentType type : VehicleDocumentRules.asOrderedList(required)) {
      List<VehicleDocument> versions = byType.getOrDefault(type, List.of());
      List<VehicleDocument> sorted = sortNewestFirst(versions);
      VehicleDocumentVersionDto currentDto = null;
      List<VehicleDocumentVersionDto> history = new ArrayList<>();
      VehicleDocumentStatus status = VehicleDocumentStatus.MISSING;
      if (!sorted.isEmpty()) {
        currentDto = toVersionDto(sorted.get(0), today);
        status = currentDto.status();
        for (int i = 1; i < sorted.size(); i++) {
          history.add(toVersionDto(sorted.get(i), today));
        }
      }
      groups.add(new VehicleDocumentGroupDto(type, true, status, currentDto, history));
    }
    return groups;
  }

  @NonNull
  private static List<VehicleDocument> sortNewestFirst(List<VehicleDocument> docs) {
    return Objects.requireNonNull(
        docs.stream()
            .sorted(
                Comparator.comparing(
                        (VehicleDocument d) -> Objects.requireNonNull(d.getCreatedAt()),
                        Comparator.reverseOrder())
                    .thenComparing(
                        d -> Objects.requireNonNull(d.getId()), Comparator.reverseOrder()))
            .toList());
  }

  @NonNull
  private VehicleDocument requireCurrentVersion(
      @NonNull String vehicleId, @NonNull VehicleDocumentType type) {
    List<VehicleDocument> versions =
        documentRepository.findByVehicle_IdAndDocumentTypeOrderByCreatedAtDesc(vehicleId, type);
    if (versions.isEmpty()) {
      throw ApiException.notFound("Document version not found");
    }
    return Objects.requireNonNull(versions.get(0));
  }

  @NonNull
  private VehicleDocument requireDocumentForVehicle(
      @NonNull String vehicleId, @NonNull String documentId) {
    VehicleDocument doc =
        documentRepository
            .findById(documentId)
            .orElseThrow(() -> ApiException.notFound("Document version not found"));
    if (!Objects.equals(doc.getVehicle().getId(), vehicleId)) {
      throw ApiException.notFound("Document version not found");
    }
    return doc;
  }

  private void assertTypeAllowed(@NonNull Vehicle vehicle, @NonNull VehicleDocumentType type) {
    if (!VehicleDocumentRules.isAllowedForVehicle(
        type, Objects.requireNonNull(vehicle.getVehicleType()), vehicle.isHasRefrigerator())) {
      throw ApiException.badRequest(
          "DOCUMENT_TYPE_NOT_ALLOWED",
          "Document type " + type + " is not allowed for this vehicle");
    }
  }

  private static void validateDates(LocalDate validFrom, LocalDate validTo) {
    if (validFrom == null || validTo == null) {
      throw ApiException.badRequest("VALIDATION_ERROR", "validFrom and validTo are required");
    }
    if (validTo.isBefore(validFrom)) {
      throw ApiException.badRequest(
          "VALIDATION_ERROR", "validTo must be greater than or equal to validFrom");
    }
  }

  private static void validateContentType(MultipartFile file) {
    String contentType = file.getContentType();
    if (contentType == null
        || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase(Locale.ROOT))) {
      throw ApiException.badRequest(
          "VALIDATION_ERROR", "Allowed content types: image/jpeg, image/png, application/pdf");
    }
  }

  @NonNull
  private VehicleDocumentVersionDto toVersionDto(VehicleDocument doc, LocalDate today) {
    StoredFileDto scan =
        storedFileService.getDto(Objects.requireNonNull(doc.getStoredFile().getId()));
    return new VehicleDocumentVersionDto(
        doc.getId(),
        doc.getDocumentType(),
        doc.getValidFrom(),
        doc.getValidTo(),
        VehicleDocumentRules.statusOf(doc.getValidTo(), Objects.requireNonNull(today)),
        scan,
        doc.getCreatedAt(),
        doc.getUpdatedAt());
  }
}
