package com.geosun.tms.reference.api;

import com.geosun.tms.auth.config.OpenApiConfig;
import com.geosun.tms.auth.exception.ApiException;
import com.geosun.tms.auth.security.UserPrincipal;
import com.geosun.tms.reference.domain.RegistrationScanSide;
import com.geosun.tms.reference.domain.VehicleListView;
import com.geosun.tms.reference.dto.request.CreateVehicleRequest;
import com.geosun.tms.reference.dto.request.UpdateVehicleRequest;
import com.geosun.tms.reference.dto.response.VehicleDto;
import com.geosun.tms.reference.service.VehicleRegistrationScanService;
import com.geosun.tms.reference.service.VehicleService;
import com.geosun.tms.storage.dto.StoredFileDto;
import com.geosun.tms.storage.service.StoredFileService.OpenedStoredFile;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Objects;
import org.springframework.core.io.Resource;
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

@Tag(name = "Admin Vehicles")
@RestController
@RequestMapping(ReferenceApiPaths.ADMIN_VEHICLES_BASE)
@PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
public class AdminVehicleController {

  private final VehicleService vehicleService;
  private final VehicleRegistrationScanService scanService;

  public AdminVehicleController(
      VehicleService vehicleService, VehicleRegistrationScanService scanService) {
    this.vehicleService = vehicleService;
    this.scanService = scanService;
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

  @Operation(summary = "Delete registration certificate scan")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @DeleteMapping("/{id}/registration-certificate/{side}")
  public ResponseEntity<Void> deleteScan(
      @PathVariable("id") @NonNull String id, @PathVariable("side") @NonNull String side) {
    scanService.delete(id, parseSide(side));
    return ResponseEntity.noContent().build();
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
