package com.geosun.tms.trips.api;

import com.geosun.tms.auth.config.OpenApiConfig;
import com.geosun.tms.auth.security.UserPrincipal;
import com.geosun.tms.storage.service.StoredFileService.OpenedStoredFile;
import com.geosun.tms.trips.dto.request.ReplaceTripExpenseLinesRequest;
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
import java.util.Objects;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
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

@Tag(name = "My Trips")
@RestController
@RequestMapping(TripsApiPaths.MY_TRIPS_BASE)
@PreAuthorize("isAuthenticated()")
public class MyTripController {

  private final TripService tripService;
  private final TripExpenseReportService expenseReportService;

  public MyTripController(TripService tripService, TripExpenseReportService expenseReportService) {
    this.tripService = tripService;
    this.expenseReportService = expenseReportService;
  }

  @Operation(summary = "List my trips")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @GetMapping
  public PageResponse<TripDto> list(
      @AuthenticationPrincipal @NonNull UserPrincipal principal,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {
    return tripService.listMy(Objects.requireNonNull(principal.getUserId()), page, size);
  }

  @Operation(summary = "Get my trip")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @GetMapping("/{id}")
  public TripDto get(
      @PathVariable("id") @NonNull String id,
      @AuthenticationPrincipal @NonNull UserPrincipal principal) {
    return tripService.getMy(id, Objects.requireNonNull(principal.getUserId()));
  }

  @Operation(summary = "Get my expense report")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @GetMapping("/{id}/expense-report")
  public TripExpenseReportDto getExpenseReport(
      @PathVariable("id") @NonNull String id,
      @AuthenticationPrincipal @NonNull UserPrincipal principal) {
    return expenseReportService.getForDriver(id, Objects.requireNonNull(principal.getUserId()));
  }

  @Operation(summary = "Replace my expense lines")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @PutMapping("/{id}/expense-report/lines")
  public TripExpenseReportDto replaceLines(
      @PathVariable("id") @NonNull String id,
      @Valid @RequestBody @NonNull ReplaceTripExpenseLinesRequest request,
      @AuthenticationPrincipal @NonNull UserPrincipal principal) {
    return expenseReportService.replaceLinesForDriver(
        id, Objects.requireNonNull(principal.getUserId()), request);
  }

  @Operation(summary = "Upload my expense receipt")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @PutMapping(
      path = "/{id}/expense-report/lines/{lineId}/receipt",
      consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public TripExpenseReportDto uploadReceipt(
      @PathVariable("id") @NonNull String id,
      @PathVariable("lineId") @NonNull String lineId,
      @RequestPart("file") @NonNull MultipartFile file,
      @AuthenticationPrincipal @NonNull UserPrincipal principal) {
    return expenseReportService.uploadReceiptForDriver(
        id, lineId, file, Objects.requireNonNull(principal.getUserId()));
  }

  @Operation(summary = "Delete my expense receipt")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @DeleteMapping("/{id}/expense-report/lines/{lineId}/receipt")
  public TripExpenseReportDto deleteReceipt(
      @PathVariable("id") @NonNull String id,
      @PathVariable("lineId") @NonNull String lineId,
      @AuthenticationPrincipal @NonNull UserPrincipal principal) {
    return expenseReportService.deleteReceiptForDriver(
        id, lineId, Objects.requireNonNull(principal.getUserId()));
  }

  @Operation(summary = "Download my expense receipt")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @GetMapping("/{id}/expense-report/lines/{lineId}/receipt")
  public ResponseEntity<Resource> downloadReceipt(
      @PathVariable("id") @NonNull String id,
      @PathVariable("lineId") @NonNull String lineId,
      @AuthenticationPrincipal @NonNull UserPrincipal principal) {
    return toInlineResponse(
        expenseReportService.openReceiptForDriver(
            id, lineId, Objects.requireNonNull(principal.getUserId())));
  }

  @Operation(summary = "Submit my expense report")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @PostMapping("/{id}/expense-report/submit")
  public TripExpenseReportDto submit(
      @PathVariable("id") @NonNull String id,
      @AuthenticationPrincipal @NonNull UserPrincipal principal) {
    return expenseReportService.submitAsDriver(id, Objects.requireNonNull(principal.getUserId()));
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
