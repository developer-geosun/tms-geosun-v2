package com.geosun.tms.reference.api;

import com.geosun.tms.auth.config.OpenApiConfig;
import com.geosun.tms.auth.exception.ApiException;
import com.geosun.tms.auth.security.UserPrincipal;
import com.geosun.tms.reference.domain.DriverDocumentType;
import com.geosun.tms.reference.domain.DriverListView;
import com.geosun.tms.reference.domain.RegistrationScanSide;
import com.geosun.tms.reference.dto.request.CreateDriverRequest;
import com.geosun.tms.reference.dto.request.LinkDriverUserRequest;
import com.geosun.tms.reference.dto.request.UpdateDriverRequest;
import com.geosun.tms.reference.dto.response.DriverDocumentVersionDto;
import com.geosun.tms.reference.dto.response.DriverDocumentsResponse;
import com.geosun.tms.reference.dto.response.DriverDto;
import com.geosun.tms.reference.dto.response.LinkableUserDto;
import com.geosun.tms.reference.service.DriverDocumentService;
import com.geosun.tms.reference.service.DriverService;
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
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@Tag(name = "Admin Drivers")
@RestController
@RequestMapping(ReferenceApiPaths.ADMIN_DRIVERS_BASE)
@PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
public class AdminDriverController {

  private final DriverService driverService;
  private final DriverDocumentService documentService;

  public AdminDriverController(DriverService driverService, DriverDocumentService documentService) {
    this.driverService = driverService;
    this.documentService = documentService;
  }

  @Operation(summary = "List drivers")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @GetMapping
  public List<DriverDto> list(@RequestParam(name = "view", defaultValue = "active") String view) {
    try {
      return driverService.list(DriverListView.fromQueryParam(view));
    } catch (IllegalArgumentException ex) {
      throw ApiException.badRequest("VALIDATION_ERROR", ex.getMessage());
    }
  }

  @Operation(summary = "Find linkable user by email")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @GetMapping("/linkable-users")
  public LinkableUserDto findLinkableUser(@RequestParam("email") @NonNull String email) {
    if (email.isBlank()) {
      throw ApiException.badRequest("VALIDATION_ERROR", "email is required");
    }
    return driverService.findLinkableUser(email);
  }

  @Operation(summary = "Get driver")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @GetMapping("/{id}")
  public DriverDto get(@PathVariable("id") @NonNull String id) {
    return driverService.getById(id);
  }

  @Operation(summary = "Create driver")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @PostMapping
  public ResponseEntity<DriverDto> create(
      @Valid @RequestBody @NonNull CreateDriverRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED).body(driverService.create(request));
  }

  @Operation(summary = "Update driver")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @PutMapping("/{id}")
  public DriverDto update(
      @PathVariable("id") @NonNull String id,
      @Valid @RequestBody @NonNull UpdateDriverRequest request) {
    return driverService.update(id, request);
  }

  @Operation(summary = "Soft-delete driver")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @DeleteMapping("/{id}")
  public ResponseEntity<Void> softDelete(@PathVariable("id") @NonNull String id) {
    driverService.softDelete(id);
    return ResponseEntity.noContent().build();
  }

  @Operation(summary = "Restore driver")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @PostMapping("/{id}/restore")
  public DriverDto restore(@PathVariable("id") @NonNull String id) {
    return driverService.restore(id);
  }

  @Operation(summary = "Link user account to driver")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @PutMapping("/{id}/user")
  public DriverDto linkUser(
      @PathVariable("id") @NonNull String id,
      @Valid @RequestBody @NonNull LinkDriverUserRequest request) {
    return driverService.linkUser(id, Objects.requireNonNull(request.userId()));
  }

  @Operation(summary = "Unlink user account from driver")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @DeleteMapping("/{id}/user")
  public DriverDto unlinkUser(@PathVariable("id") @NonNull String id) {
    return driverService.unlinkUser(id);
  }

  @Operation(summary = "List driver documents")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @GetMapping("/{id}/documents")
  public DriverDocumentsResponse listDocuments(@PathVariable("id") @NonNull String id) {
    return documentService.listDocuments(id);
  }

  @Operation(summary = "Add driver document version")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @PostMapping(
      path = "/{id}/documents/{type}/{side}",
      consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public ResponseEntity<DriverDocumentVersionDto> addDocument(
      @PathVariable("id") @NonNull String id,
      @PathVariable("type") @NonNull String type,
      @PathVariable("side") @NonNull String side,
      @RequestParam("validFrom") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) @NonNull
          LocalDate validFrom,
      @RequestParam("validTo") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) @NonNull
          LocalDate validTo,
      @RequestPart("file") @NonNull MultipartFile file,
      @AuthenticationPrincipal @NonNull UserPrincipal principal) {
    DriverDocumentType documentType = parseDocumentType(type);
    RegistrationScanSide scanSide = parseSide(side);
    String userId = Objects.requireNonNull(principal.getUserId());
    DriverDocumentVersionDto created =
        documentService.addVersion(id, documentType, scanSide, validFrom, validTo, file, userId);
    return ResponseEntity.status(HttpStatus.CREATED).body(created);
  }

  @Operation(summary = "Download driver document file")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @GetMapping("/{id}/documents/{documentId}/file")
  public ResponseEntity<Resource> downloadFile(
      @PathVariable("id") @NonNull String id,
      @PathVariable("documentId") @NonNull String documentId) {
    return toInlineResponse(documentService.openFile(id, documentId));
  }

  @Operation(summary = "Delete driver document version")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @DeleteMapping("/{id}/documents/{documentId}")
  public ResponseEntity<Void> deleteDocument(
      @PathVariable("id") @NonNull String id,
      @PathVariable("documentId") @NonNull String documentId) {
    documentService.deleteVersion(id, documentId);
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
        .body(Objects.requireNonNull(opened.resource()));
  }

  @NonNull
  private static DriverDocumentType parseDocumentType(@NonNull String type) {
    try {
      return DriverDocumentType.fromPath(type);
    } catch (IllegalArgumentException ex) {
      throw ApiException.badRequest("VALIDATION_ERROR", ex.getMessage());
    }
  }

  @NonNull
  private static RegistrationScanSide parseSide(@NonNull String side) {
    try {
      return RegistrationScanSide.fromPath(side);
    } catch (IllegalArgumentException ex) {
      throw ApiException.badRequest("VALIDATION_ERROR", ex.getMessage());
    }
  }
}
