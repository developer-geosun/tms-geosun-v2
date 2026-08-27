package com.geosun.tms.trips.api;

import com.geosun.tms.auth.config.OpenApiConfig;
import com.geosun.tms.auth.exception.ApiException;
import com.geosun.tms.auth.security.UserPrincipal;
import com.geosun.tms.storage.service.StoredFileService.OpenedStoredFile;
import com.geosun.tms.trips.domain.TripListView;
import com.geosun.tms.trips.domain.TripStatus;
import com.geosun.tms.trips.dto.request.CreateTripRequest;
import com.geosun.tms.trips.dto.request.ReplaceTripExpenseLinesRequest;
import com.geosun.tms.trips.dto.request.ReviewTripExpenseReportRequest;
import com.geosun.tms.trips.dto.request.UpdateTripRequest;
import com.geosun.tms.trips.dto.request.UpdateTripStatusRequest;
import com.geosun.tms.trips.dto.response.PageResponse;
import com.geosun.tms.trips.dto.response.TripDto;
import com.geosun.tms.trips.dto.response.TripExpenseReportDto;
import com.geosun.tms.trips.service.TripExpenseReportService;
import com.geosun.tms.trips.service.TripService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
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

@Tag(name = "Admin Trips")
@RestController
@RequestMapping(TripsApiPaths.ADMIN_TRIPS_BASE)
@PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
public class AdminTripController {

  private final TripService tripService;
  private final TripExpenseReportService expenseReportService;

  public AdminTripController(
      TripService tripService, TripExpenseReportService expenseReportService) {
    this.tripService = tripService;
    this.expenseReportService = expenseReportService;
  }

  @Operation(summary = "List trips")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @GetMapping
  public PageResponse<TripDto> list(
      @RequestParam(name = "view", defaultValue = "active") String view,
      @RequestParam(required = false) TripStatus status,
      @RequestParam(required = false) String driverId,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
          Instant plannedFrom,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
          Instant plannedTo,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {
    try {
      return tripService.listAdmin(
          TripListView.fromQueryParam(view), status, driverId, plannedFrom, plannedTo, page, size);
    } catch (IllegalArgumentException ex) {
      throw ApiException.badRequest("VALIDATION_ERROR", ex.getMessage());
    }
  }

  @Operation(summary = "Get trip")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @GetMapping("/{id}")
  public TripDto get(@PathVariable("id") @NonNull String id) {
    return tripService.getAdmin(id);
  }

  @Operation(summary = "Create trip")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @PostMapping
  public ResponseEntity<TripDto> create(@Valid @RequestBody @NonNull CreateTripRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED).body(tripService.create(request));
  }

  @Operation(summary = "Update trip")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @PutMapping("/{id}")
  public TripDto update(
      @PathVariable("id") @NonNull String id,
      @Valid @RequestBody @NonNull UpdateTripRequest request) {
    return tripService.update(id, request);
  }

  @Operation(summary = "Update trip status")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @PatchMapping("/{id}/status")
  public TripDto updateStatus(
      @PathVariable("id") @NonNull String id,
      @Valid @RequestBody @NonNull UpdateTripStatusRequest request) {
    return tripService.updateStatus(id, Objects.requireNonNull(request.status()));
  }

  @Operation(summary = "Soft-delete trip")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @DeleteMapping("/{id}")
  public ResponseEntity<Void> softDelete(@PathVariable("id") @NonNull String id) {
    tripService.softDelete(id);
    return ResponseEntity.noContent().build();
  }

  @Operation(summary = "Restore trip")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @PostMapping("/{id}/restore")
  public TripDto restore(@PathVariable("id") @NonNull String id) {
    return tripService.restore(id);
  }

  @Operation(summary = "Get expense report")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @GetMapping("/{id}/expense-report")
  public TripExpenseReportDto getExpenseReport(@PathVariable("id") @NonNull String id) {
    return expenseReportService.getForAdmin(id);
  }

  @Operation(summary = "Replace expense lines")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @PutMapping("/{id}/expense-report/lines")
  public TripExpenseReportDto replaceLines(
      @PathVariable("id") @NonNull String id,
      @Valid @RequestBody @NonNull ReplaceTripExpenseLinesRequest request) {
    return expenseReportService.replaceLinesForAdmin(id, request);
  }

  @Operation(summary = "Upload expense receipt")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @PutMapping(
      path = "/{id}/expense-report/lines/{lineId}/receipt",
      consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public TripExpenseReportDto uploadReceipt(
      @PathVariable("id") @NonNull String id,
      @PathVariable("lineId") @NonNull String lineId,
      @RequestPart("file") @NonNull MultipartFile file,
      @AuthenticationPrincipal @NonNull UserPrincipal principal) {
    return expenseReportService.uploadReceiptForAdmin(
        id, lineId, file, Objects.requireNonNull(principal.getUserId()));
  }

  @Operation(summary = "Delete expense receipt")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @DeleteMapping("/{id}/expense-report/lines/{lineId}/receipt")
  public TripExpenseReportDto deleteReceipt(
      @PathVariable("id") @NonNull String id, @PathVariable("lineId") @NonNull String lineId) {
    return expenseReportService.deleteReceiptForAdmin(id, lineId);
  }

  @Operation(summary = "Download expense receipt")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @GetMapping("/{id}/expense-report/lines/{lineId}/receipt")
  public ResponseEntity<Resource> downloadReceipt(
      @PathVariable("id") @NonNull String id, @PathVariable("lineId") @NonNull String lineId) {
    return toInlineResponse(expenseReportService.openReceipt(id, lineId));
  }

  @Operation(summary = "Submit expense report")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @PostMapping("/{id}/expense-report/submit")
  public TripExpenseReportDto submit(
      @PathVariable("id") @NonNull String id,
      @AuthenticationPrincipal @NonNull UserPrincipal principal) {
    return expenseReportService.submit(id, Objects.requireNonNull(principal.getUserId()));
  }

  @Operation(summary = "Review expense report")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @PostMapping("/{id}/expense-report/review")
  public TripExpenseReportDto review(
      @PathVariable("id") @NonNull String id,
      @Valid @RequestBody @NonNull ReviewTripExpenseReportRequest request,
      @AuthenticationPrincipal @NonNull UserPrincipal principal) {
    return expenseReportService.review(id, Objects.requireNonNull(principal.getUserId()), request);
  }

  @Operation(summary = "Reopen approved expense report")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @PostMapping("/{id}/expense-report/reopen")
  public TripExpenseReportDto reopen(@PathVariable("id") @NonNull String id) {
    return expenseReportService.reopen(id);
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
        .contentLength(opened.file().getSizeBytes())
        .body(Objects.requireNonNull(opened.resource()));
  }
}
