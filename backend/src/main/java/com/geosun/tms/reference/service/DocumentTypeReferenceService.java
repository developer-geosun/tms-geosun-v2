package com.geosun.tms.reference.service;

import com.geosun.tms.auth.exception.ApiException;
import com.geosun.tms.reference.domain.DocumentTypeFieldDefinition;
import com.geosun.tms.reference.domain.DocumentTypeListView;
import com.geosun.tms.reference.domain.DocumentTypeReference;
import com.geosun.tms.reference.dto.request.CreateDocumentTypeRequest;
import com.geosun.tms.reference.dto.request.DocumentTypeFieldDefinitionRequest;
import com.geosun.tms.reference.dto.request.UpdateDocumentTypeRequest;
import com.geosun.tms.reference.dto.response.DocumentTypeFieldDefinitionDto;
import com.geosun.tms.reference.dto.response.DocumentTypeReferenceDto;
import com.geosun.tms.reference.repository.CountryReferenceRepository;
import com.geosun.tms.reference.repository.DocumentTypeReferenceRepository;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Pattern;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DocumentTypeReferenceService {

  private static final Pattern FIELD_KEY_PATTERN = Pattern.compile("[a-zA-Z][a-zA-Z0-9_]*");

  private final DocumentTypeReferenceRepository documentTypeRepository;
  private final CountryReferenceRepository countryReferenceRepository;

  public DocumentTypeReferenceService(
      DocumentTypeReferenceRepository documentTypeRepository,
      CountryReferenceRepository countryReferenceRepository) {
    this.documentTypeRepository = documentTypeRepository;
    this.countryReferenceRepository = countryReferenceRepository;
  }

  @Transactional(readOnly = true)
  public List<DocumentTypeReferenceDto> list(
      DocumentTypeListView view, String search, String country) {
    String normalizedSearch = normalizeSearch(search);
    String normalizedCountry = normalizeCountryFilter(country);
    DocumentTypeListView effectiveView = view == null ? DocumentTypeListView.ACTIVE : view;
    List<DocumentTypeReference> rows =
        switch (effectiveView) {
          case ACTIVE -> documentTypeRepository.searchActive(normalizedSearch, normalizedCountry);
          case DELETED -> documentTypeRepository.searchDeleted(normalizedSearch, normalizedCountry);
          case ALL -> documentTypeRepository.searchAll(normalizedSearch, normalizedCountry);
        };
    return rows.stream().map(row -> toDto(Objects.requireNonNull(row))).toList();
  }

  @Transactional(readOnly = true)
  public DocumentTypeReferenceDto getById(@NonNull String id) {
    DocumentTypeReference row = requireDocumentType(id);
    return toDto(row);
  }

  @Transactional
  public DocumentTypeReferenceDto create(@NonNull CreateDocumentTypeRequest request) {
    String countryCode = normalizeCountryCode(request.countryCode());
    assertCountryExists(countryCode);
    String nameUk = normalizeName(request.nameUk());
    assertUniqueName(countryCode, nameUk, null);

    DocumentTypeReference row = new DocumentTypeReference();
    applyFields(
        row,
        nameUk,
        normalizeName(request.nameEn()),
        normalizeName(request.nameRu()),
        countryCode,
        request.plannedScanPages(),
        normalizeFieldDefinitions(request.fieldDefinitions()));
    DocumentTypeReference saved =
        Objects.requireNonNull(documentTypeRepository.save(Objects.requireNonNull(row)));
    return toDto(saved);
  }

  @Transactional
  public DocumentTypeReferenceDto update(
      @NonNull String id, @NonNull UpdateDocumentTypeRequest request) {
    DocumentTypeReference row = requireActiveDocumentType(id);
    String countryCode = normalizeCountryCode(request.countryCode());
    assertCountryExists(countryCode);
    String nameUk = normalizeName(request.nameUk());
    assertUniqueName(countryCode, nameUk, id);

    applyFields(
        row,
        nameUk,
        normalizeName(request.nameEn()),
        normalizeName(request.nameRu()),
        countryCode,
        request.plannedScanPages(),
        normalizeFieldDefinitions(request.fieldDefinitions()));
    DocumentTypeReference saved =
        Objects.requireNonNull(documentTypeRepository.save(Objects.requireNonNull(row)));
    return toDto(saved);
  }

  @Transactional
  public void softDelete(@NonNull String id) {
    DocumentTypeReference row = requireDocumentType(id);
    if (row.isDeleted()) {
      return;
    }
    row.setDeleted(true);
    row.setDeletedAt(Instant.now());
    documentTypeRepository.save(row);
  }

  @Transactional
  public DocumentTypeReferenceDto restore(@NonNull String id) {
    DocumentTypeReference row = requireDocumentType(id);
    if (!row.isDeleted()) {
      return toDto(row);
    }
    assertUniqueName(
        Objects.requireNonNull(row.getCountryCode()), Objects.requireNonNull(row.getNameUk()), id);
    row.setDeleted(false);
    row.setDeletedAt(null);
    DocumentTypeReference saved = Objects.requireNonNull(documentTypeRepository.save(row));
    return toDto(saved);
  }

  private void applyFields(
      DocumentTypeReference row,
      String nameUk,
      String nameEn,
      String nameRu,
      String countryCode,
      int plannedScanPages,
      List<DocumentTypeFieldDefinition> fieldDefinitions) {
    if (plannedScanPages < 0) {
      throw ApiException.badRequest("VALIDATION_ERROR", "plannedScanPages must be >= 0");
    }
    row.setNameUk(nameUk);
    row.setNameEn(nameEn);
    row.setNameRu(nameRu);
    row.setCountryCode(countryCode);
    row.setPlannedScanPages(plannedScanPages);
    row.setFieldDefinitions(fieldDefinitions);
  }

  private List<DocumentTypeFieldDefinition> normalizeFieldDefinitions(
      List<DocumentTypeFieldDefinitionRequest> raw) {
    if (raw == null) {
      throw ApiException.badRequest("VALIDATION_ERROR", "fieldDefinitions is required");
    }
    Set<String> seenKeys = new HashSet<>();
    List<DocumentTypeFieldDefinition> normalized = new ArrayList<>();
    for (DocumentTypeFieldDefinitionRequest item : raw) {
      String key = normalizeFieldKey(item.key());
      if (!seenKeys.add(key)) {
        throw ApiException.badRequest(
            "VALIDATION_ERROR", "Duplicate field key in fieldDefinitions: " + key);
      }
      normalized.add(
          new DocumentTypeFieldDefinition(
              key,
              normalizeName(item.nameUk()),
              normalizeName(item.nameEn()),
              normalizeName(item.nameRu())));
    }
    return normalized;
  }

  private static String normalizeFieldKey(String key) {
    if (key == null || key.isBlank()) {
      throw ApiException.badRequest("VALIDATION_ERROR", "fieldDefinitions[].key is required");
    }
    String trimmed = key.trim();
    if (!FIELD_KEY_PATTERN.matcher(trimmed).matches()) {
      throw ApiException.badRequest(
          "VALIDATION_ERROR",
          "fieldDefinitions[].key must match [a-zA-Z][a-zA-Z0-9_]*, got: " + trimmed);
    }
    return trimmed;
  }

  private void assertCountryExists(String countryCode) {
    if (!countryReferenceRepository.existsById(Objects.requireNonNull(countryCode))) {
      throw ApiException.badRequest("COUNTRY_NOT_FOUND", "Country not found: " + countryCode);
    }
  }

  private void assertUniqueName(String countryCode, String nameUk, String excludeId) {
    boolean exists =
        excludeId == null
            ? documentTypeRepository
                .existsByCountryCodeIgnoreCaseAndNameUkIgnoreCaseAndDeletedFalse(
                    countryCode, nameUk)
            : documentTypeRepository
                .existsByCountryCodeIgnoreCaseAndNameUkIgnoreCaseAndDeletedFalseAndIdNot(
                    countryCode, nameUk, excludeId);
    if (exists) {
      throw ApiException.conflict(
          "DOCUMENT_TYPE_NAME_EXISTS",
          "Active document type with this name already exists for country " + countryCode);
    }
  }

  private DocumentTypeReference requireDocumentType(@NonNull String id) {
    return documentTypeRepository
        .findById(Objects.requireNonNull(id))
        .orElseThrow(() -> ApiException.notFound("Document type not found"));
  }

  private DocumentTypeReference requireActiveDocumentType(@NonNull String id) {
    DocumentTypeReference row = requireDocumentType(Objects.requireNonNull(id));
    if (row.isDeleted()) {
      throw ApiException.conflict("DOCUMENT_TYPE_DELETED", "Document type is deleted");
    }
    return row;
  }

  private DocumentTypeReferenceDto toDto(DocumentTypeReference row) {
    List<DocumentTypeFieldDefinitionDto> fields =
        row.getFieldDefinitions().stream()
            .map(
                f ->
                    new DocumentTypeFieldDefinitionDto(f.key(), f.nameUk(), f.nameEn(), f.nameRu()))
            .toList();
    return new DocumentTypeReferenceDto(
        Objects.requireNonNull(row.getId()),
        row.getNameUk(),
        row.getNameEn(),
        row.getNameRu(),
        row.getCountryCode(),
        row.getPlannedScanPages(),
        fields,
        row.isDeleted(),
        row.getDeletedAt(),
        row.getCreatedAt(),
        row.getUpdatedAt());
  }

  private static String normalizeName(String value) {
    if (value == null || value.isBlank()) {
      throw ApiException.badRequest("VALIDATION_ERROR", "Name is required");
    }
    return value.trim();
  }

  private static String normalizeCountryCode(String countryCode) {
    if (countryCode == null || countryCode.isBlank()) {
      throw ApiException.badRequest("VALIDATION_ERROR", "countryCode is required");
    }
    return CountryReferenceService.normalizeCountryCode(countryCode);
  }

  private static String normalizeSearch(String search) {
    if (search == null) {
      return null;
    }
    String trimmed = search.trim();
    return trimmed.isEmpty() ? null : trimmed;
  }

  private static String normalizeCountryFilter(String country) {
    if (country == null || country.isBlank()) {
      return null;
    }
    return country.trim().toUpperCase(Locale.ROOT);
  }
}
