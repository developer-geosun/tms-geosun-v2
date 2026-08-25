package com.geosun.tms.storage.api;

import com.geosun.tms.auth.config.OpenApiConfig;
import com.geosun.tms.auth.security.UserPrincipal;
import com.geosun.tms.storage.dto.StorageInfoDto;
import com.geosun.tms.storage.dto.StoredFileDto;
import com.geosun.tms.storage.service.StoredFileService;
import com.geosun.tms.storage.service.StoredFileService.OpenedStoredFile;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
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
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * Тестовий ADMIN API для перевірки сховища файлів (не для бізнес-документів).
 */
@Tag(name = "Admin Stored Files (test)")
@RestController
@RequestMapping(StorageApiPaths.ADMIN_STORED_FILES_BASE)
@PreAuthorize("hasRole('ADMIN')")
public class AdminStoredFileController {

  private final StoredFileService storedFileService;

  public AdminStoredFileController(StoredFileService storedFileService) {
    this.storedFileService = storedFileService;
  }

  @Operation(summary = "Current storage backend type")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @GetMapping("/storage-info")
  public StorageInfoDto storageInfo() {
    return new StorageInfoDto(storedFileService.storageType());
  }

  @Operation(summary = "List stored file metadata")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @GetMapping
  public List<StoredFileDto> list() {
    return storedFileService.listAll();
  }

  @Operation(summary = "Upload a test file (any type, max 10MB)")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public ResponseEntity<StoredFileDto> upload(
      @AuthenticationPrincipal @NonNull UserPrincipal principal,
      @RequestPart("file") @NonNull MultipartFile file) {
    String userId = Objects.requireNonNull(principal.getUserId());
    StoredFileDto dto =
        storedFileService.storeMultipart(file, StoredFileService.ADMIN_TEST_DIR, userId);
    return ResponseEntity.status(HttpStatus.CREATED).body(dto);
  }

  @Operation(summary = "Download stored file content")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @GetMapping("/{id}")
  public ResponseEntity<Resource> download(@PathVariable String id) {
    OpenedStoredFile opened = storedFileService.open(Objects.requireNonNull(id));
    MediaType mediaType;
    try {
      mediaType = MediaType.parseMediaType(Objects.requireNonNull(opened.file().getContentType()));
    } catch (Exception ex) {
      mediaType = MediaType.APPLICATION_OCTET_STREAM;
    }
    ContentDisposition disposition =
        ContentDisposition.attachment()
            .filename(
                Objects.requireNonNull(opened.file().getOriginalFilename()), StandardCharsets.UTF_8)
            .build();
    return ResponseEntity.ok()
        .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
        .contentType(Objects.requireNonNull(mediaType))
        .body(opened.resource());
  }

  @Operation(summary = "Delete stored file")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(@PathVariable String id) {
    storedFileService.delete(Objects.requireNonNull(id));
    return ResponseEntity.noContent().build();
  }
}
