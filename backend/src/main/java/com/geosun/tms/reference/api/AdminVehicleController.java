package com.geosun.tms.reference.api;

import com.geosun.tms.auth.config.OpenApiConfig;
import com.geosun.tms.auth.exception.ApiException;
import com.geosun.tms.auth.security.UserPrincipal;
import com.geosun.tms.reference.domain.RegistrationScanSide;
import com.geosun.tms.reference.domain.VehicleDocumentType;
import com.geosun.tms.reference.domain.VehicleListView;
import com.geosun.tms.reference.dto.request.CreateVehicleRequest;
import com.geosun.tms.reference.dto.request.UpdateVehicleDocumentRequest;
import com.geosun.tms.reference.dto.request.UpdateVehicleRequest;
import com.geosun.tms.reference.dto.response.VehicleDocumentVersionDto;
import com.geosun.tms.reference.dto.response.VehicleDocumentsResponse;
import com.geosun.tms.reference.dto.response.VehicleDto;
import com.geosun.tms.reference.service.VehicleDocumentService;
import com.geosun.tms.reference.service.VehicleRegistrationScanService;
import com.geosun.tms.reference.service.VehicleService;
import com.geosun.tms.storage.dto.StoredFileDto;
import com.geosun.tms.storage.service.StoredFileService.OpenedStoredFile;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import org.springframework.core.io.Resource;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.lang.NonNull;
import org.springframework.lang.Nullable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@Tag(name = "Admin Vehicles")
@RestController
@RequestMapping(ReferenceApiPaths.ADMIN_VEHICLES_BASE)
@PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
public class AdminVehicleController {

  private final VehicleService vehicleService;
  private final VehicleRegistrationScanService scanService;
  private final VehicleDocumentService documentService;

  public AdminVehicleController(
      VehicleService vehicleService,
      VehicleRegistrationScanService scanService,
      VehicleDocumentService documentService) {
    this.vehicleService = vehicleService;
    this.scanService = scanService;
    this.documentService = documentService;
  }

  @Operation(summary = "List vehicles")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @GetMapping
  public List<VehicleDto> list(@RequestParam(name = "view", defaultValue = "active") String view) {
    try {
      return vehicleService.list(VehicleListView.fromQueryParam(view));
    } catch (IllegalArgumentException ex) {
      throw ApiException.badRequest("VALIDATION_ERROR", ex.getMessage());
    }
  }

  @Operation(summary = "Get vehicle by id")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @GetMapping("/{id}")
  public VehicleDto getById(@PathVariable("id") @NonNull String id) {
    return vehicleService.getById(id);
  }

  @Operation(summary = "Create vehicle")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @PostMapping
  public ResponseEntity<VehicleDto> create(
      @Valid @RequestBody @NonNull CreateVehicleRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED).body(vehicleService.create(request));
  }

  @Operation(summary = "Update vehicle")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @PutMapping("/{id}")
  public VehicleDto update(
      @PathVariable("id") @NonNull String id,
      @Valid @RequestBody @NonNull UpdateVehicleRequest request) {
    return vehicleService.update(id, request);
  }

  @Operation(summary = "Soft-delete vehicle")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @DeleteMapping("/{id}")
  public ResponseEntity<Void> softDelete(@PathVariable("id") @NonNull String id) {
    vehicleService.softDelete(id);
    return ResponseEntity.noContent().build();
  }

  @Operation(summary = "Restore soft-deleted vehicle")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @PostMapping("/{id}/restore")
  public VehicleDto restore(@PathVariable("id") @NonNull String id) {
    return vehicleService.restore(id);
  }

  @Operation(summary = "List vehicle documents with history")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @GetMapping("/{id}/documents")
  public VehicleDocumentsResponse listDocuments(@PathVariable("id") @NonNull String id) {
    return documentService.listDocuments(id);
  }

  @Operation(summary = "Add vehicle document version")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @PostMapping(path = "/{id}/documents/{type}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public ResponseEntity<VehicleDocumentVersionDto> addDocument(
      @AuthenticationPrincipal @NonNull UserPrincipal principal,
      @PathVariable("id") @NonNull String id,
      @PathVariable("type") @NonNull String type,
      @RequestParam("validFrom") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) @NonNull
          LocalDate validFrom,
      @RequestParam("validTo") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) @NonNull
          LocalDate validTo,
      @RequestPart("file") @NonNull MultipartFile file) {
    String userId = Objects.requireNonNull(principal.getUserId());
    VehicleDocumentVersionDto created =
        documentService.addVersion(id, parseDocumentType(type), validFrom, validTo, file, userId);
    return ResponseEntity.status(HttpStatus.CREATED).body(created);
  }

  @Operation(summary = "Update current vehicle document version")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @PatchMapping(
      path = "/{id}/documents/{documentId}",
      consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public VehicleDocumentVersionDto patchDocument(
      @AuthenticationPrincipal @NonNull UserPrincipal principal,
      @PathVariable("id") @NonNull String id,
      @PathVariable("documentId") @NonNull String documentId,
      @RequestParam(value = "validFrom", required = false)
          @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
          @Nullable
          LocalDate validFrom,
      @RequestParam(value = "validTo", required = false)
          @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
          @Nullable
          LocalDate validTo,
      @RequestPart(value = "file", required = false) @Nullable MultipartFile file) {
    String userId = Objects.requireNonNull(principal.getUserId());
    UpdateVehicleDocumentRequest dates = null;
    if (validFrom != null && validTo != null) {
      dates = new UpdateVehicleDocumentRequest(validFrom, validTo);
    } else if (validFrom != null || validTo != null) {
      throw ApiException.badRequest(
          "VALIDATION_ERROR", "validFrom and validTo must be provided together");
    }
    return documentService.patchCurrent(id, documentId, dates, file, userId);
  }

  @Operation(summary = "Download vehicle document scan")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @GetMapping("/{id}/documents/{documentId}/scan")
  public ResponseEntity<Resource> downloadDocumentScan(
      @PathVariable("id") @NonNull String id,
      @PathVariable("documentId") @NonNull String documentId) {
    OpenedStoredFile opened = documentService.openScan(id, documentId);
    return toInlineResponse(opened);
  }

  @Operation(summary = "Delete vehicle document version")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @DeleteMapping("/{id}/documents/{documentId}")
  public ResponseEntity<Void> deleteDocument(
      @PathVariable("id") @NonNull String id,
      @PathVariable("documentId") @NonNull String documentId) {
    documentService.deleteVersion(id, documentId);
    return ResponseEntity.noContent().build();
  }

  @Operation(summary = "Upload or replace registration certificate scan")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @PutMapping(
      path = "/{id}/registration-certificate/{side}",
      consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public StoredFileDto uploadScan(
      @AuthenticationPrincipal @NonNull UserPrincipal principal,
      @PathVariable("id") @NonNull String id,
      @PathVariable("side") @NonNull String side,
      @RequestPart("file") @NonNull MultipartFile file) {
    String userId = Objects.requireNonNull(principal.getUserId());
    return scanService.uploadOrReplace(id, parseSide(side), file, userId);
  }

  @Operation(summary = "Download registration certificate scan")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @GetMapping("/{id}/registration-certificate/{side}")
  public ResponseEntity<Resource> downloadScan(
      @PathVariable("id") @NonNull String id, @PathVariable("side") @NonNull String side) {
    OpenedStoredFile opened = scanService.open(id, parseSide(side));
    return toInlineResponse(opened);
  }

  @Operation(summary = "Delete registration certificate scan")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @DeleteMapping("/{id}/registration-certificate/{side}")
  public ResponseEntity<Void> deleteScan(
      @PathVariable("id") @NonNull String id, @PathVariable("side") @NonNull String side) {
    scanService.delete(id, parseSide(side));
    return ResponseEntity.noContent().build();
  }

  @NonNull
  private static ResponseEntity<Resource> toInlineResponse(@NonNull OpenedStoredFile opened) {
    MediaType mediaType;
    try {
      mediaType = MediaType.parseMediaType(Objects.requireNonNull(opened.file().getContentType()));
    } catch (Exception ex) {
      mediaType = MediaType.APPLICATION_OCTET_STREAM;
    }
    ContentDisposition disposition =
        ContentDisposition.inline()
            .filename(
                Objects.requireNonNull(opened.file().getOriginalFilename()), StandardCharsets.UTF_8)
            .build();
    return ResponseEntity.ok()
        .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
        .contentType(Objects.requireNonNull(mediaType))
        .body(opened.resource());
  }

  @NonNull
  private static RegistrationScanSide parseSide(@NonNull String side) {
    try {
      return RegistrationScanSide.fromPath(side);
    } catch (IllegalArgumentException ex) {
      throw ApiException.badRequest("VALIDATION_ERROR", ex.getMessage());
    }
  }

  @NonNull
  private static VehicleDocumentType parseDocumentType(@NonNull String type) {
    try {
      return VehicleDocumentType.fromPath(type);
    } catch (IllegalArgumentException ex) {
      throw ApiException.badRequest("VALIDATION_ERROR", ex.getMessage());
    }
  }
}
