package com.geosun.tms.reference.api;

import com.geosun.tms.auth.config.OpenApiConfig;
import com.geosun.tms.auth.exception.ApiException;
import com.geosun.tms.reference.domain.DocumentTypeListView;
import com.geosun.tms.reference.dto.request.CreateDocumentTypeRequest;
import com.geosun.tms.reference.dto.request.UpdateDocumentTypeRequest;
import com.geosun.tms.reference.dto.response.DocumentTypeReferenceDto;
import com.geosun.tms.reference.service.DocumentTypeReferenceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.lang.NonNull;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Admin Document Types")
@RestController
@RequestMapping(ReferenceApiPaths.ADMIN_DOCUMENT_TYPES_BASE)
@PreAuthorize("hasRole('ADMIN')")
public class AdminDocumentTypeController {

  private final DocumentTypeReferenceService documentTypeService;

  public AdminDocumentTypeController(DocumentTypeReferenceService documentTypeService) {
    this.documentTypeService = documentTypeService;
  }

  @Operation(summary = "List document types")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @GetMapping
  public List<DocumentTypeReferenceDto> list(
      @RequestParam(name = "view", defaultValue = "active") String view,
      @RequestParam(required = false) String search,
      @RequestParam(required = false) String country) {
    try {
      return documentTypeService.list(DocumentTypeListView.fromQueryParam(view), search, country);
    } catch (IllegalArgumentException ex) {
      throw ApiException.badRequest("VALIDATION_ERROR", ex.getMessage());
    }
  }

  @Operation(summary = "Get document type by id")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @GetMapping("/{id}")
  public DocumentTypeReferenceDto getById(@PathVariable("id") @NonNull String id) {
    return documentTypeService.getById(id);
  }

  @Operation(summary = "Create document type")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @PostMapping
  public ResponseEntity<DocumentTypeReferenceDto> create(
      @Valid @RequestBody @NonNull CreateDocumentTypeRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED).body(documentTypeService.create(request));
  }

  @Operation(summary = "Update document type")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @PutMapping("/{id}")
  public DocumentTypeReferenceDto update(
      @PathVariable("id") @NonNull String id,
      @Valid @RequestBody @NonNull UpdateDocumentTypeRequest request) {
    return documentTypeService.update(id, request);
  }

  @Operation(summary = "Soft-delete document type")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @DeleteMapping("/{id}")
  public ResponseEntity<Void> softDelete(@PathVariable("id") @NonNull String id) {
    documentTypeService.softDelete(id);
    return ResponseEntity.noContent().build();
  }

  @Operation(summary = "Restore soft-deleted document type")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @PostMapping("/{id}/restore")
  public DocumentTypeReferenceDto restore(@PathVariable("id") @NonNull String id) {
    return documentTypeService.restore(id);
  }
}
