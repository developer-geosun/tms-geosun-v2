package com.geosun.tms.trips.service;

import com.geosun.tms.auth.exception.ApiException;
import com.geosun.tms.reference.repository.CurrencyRepository;
import com.geosun.tms.storage.dto.StoredFileDto;
import com.geosun.tms.storage.service.StoredFileService;
import com.geosun.tms.storage.service.StoredFileService.OpenedStoredFile;
import com.geosun.tms.trips.domain.Trip;
import com.geosun.tms.trips.domain.TripExpenseLine;
import com.geosun.tms.trips.domain.TripExpenseReport;
import com.geosun.tms.trips.domain.TripExpenseReportStatus;
import com.geosun.tms.trips.domain.TripStatus;
import com.geosun.tms.trips.dto.request.ReplaceTripExpenseLinesRequest;
import com.geosun.tms.trips.dto.request.ReplaceTripExpenseLinesRequest.TripExpenseLineInput;
import com.geosun.tms.trips.dto.request.ReviewTripExpenseReportRequest;
import com.geosun.tms.trips.dto.response.TripExpenseReportDto;
import com.geosun.tms.trips.dto.response.TripExpenseReportDto.TripExpenseLineDto;
import com.geosun.tms.trips.repository.TripExpenseLineRepository;
import com.geosun.tms.trips.repository.TripExpenseReportRepository;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

@Service
public class TripExpenseReportService {

  private static final Set<String> ALLOWED_CONTENT_TYPES =
      Set.of("image/jpeg", "image/png", "application/pdf");

  private final TripService tripService;
  private final TripExpenseReportRepository reportRepository;
  private final TripExpenseLineRepository lineRepository;
  private final CurrencyRepository currencyRepository;
  private final StoredFileService storedFileService;

  public TripExpenseReportService(
      TripService tripService,
      TripExpenseReportRepository reportRepository,
      TripExpenseLineRepository lineRepository,
      CurrencyRepository currencyRepository,
      StoredFileService storedFileService) {
    this.tripService = tripService;
    this.reportRepository = reportRepository;
    this.lineRepository = lineRepository;
    this.currencyRepository = currencyRepository;
    this.storedFileService = storedFileService;
  }

  @Transactional(readOnly = true)
  public TripExpenseReportDto getForAdmin(@NonNull String tripId) {
    tripService.requireTrip(tripId);
    return toDto(requireReport(tripId));
  }

  @Transactional(readOnly = true)
  public TripExpenseReportDto getForDriver(@NonNull String tripId, @NonNull String userId) {
    tripService.requireOwnedTrip(tripId, userId);
    return toDto(requireReport(tripId));
  }

  @Transactional
  public TripExpenseReportDto replaceLinesForAdmin(
      @NonNull String tripId, @NonNull ReplaceTripExpenseLinesRequest request) {
    Trip trip = tripService.requireActiveTrip(tripId);
    TripExpenseReport report = requireReport(tripId);
    assertEditableByManager(report);
    assertTripAllowsExpenseEdit(trip);
    replaceLines(report, Objects.requireNonNull(request.lines()));
    return toDto(report);
  }

  @Transactional
  public TripExpenseReportDto replaceLinesForDriver(
      @NonNull String tripId,
      @NonNull String userId,
      @NonNull ReplaceTripExpenseLinesRequest request) {
    Trip trip = tripService.requireOwnedTrip(tripId, userId);
    TripExpenseReport report = requireReport(tripId);
    assertEditableByDriver(report);
    assertTripAllowsExpenseEdit(trip);
    replaceLines(report, Objects.requireNonNull(request.lines()));
    return toDto(report);
  }

  @Transactional
  public TripExpenseReportDto uploadReceiptForAdmin(
      @NonNull String tripId,
      @NonNull String lineId,
      @NonNull MultipartFile file,
      @NonNull String userId) {
    Trip trip = tripService.requireActiveTrip(tripId);
    TripExpenseReport report = requireReport(tripId);
    assertEditableByManager(report);
    assertTripAllowsExpenseEdit(trip);
    uploadReceipt(report, lineId, file, userId);
    return toDto(report);
  }

  @Transactional
  public TripExpenseReportDto uploadReceiptForDriver(
      @NonNull String tripId,
      @NonNull String lineId,
      @NonNull MultipartFile file,
      @NonNull String userId) {
    Trip trip = tripService.requireOwnedTrip(tripId, userId);
    TripExpenseReport report = requireReport(tripId);
    assertEditableByDriver(report);
    assertTripAllowsExpenseEdit(trip);
    uploadReceipt(report, lineId, file, userId);
    return toDto(report);
  }

  @Transactional
  public TripExpenseReportDto deleteReceiptForAdmin(
      @NonNull String tripId, @NonNull String lineId) {
    Trip trip = tripService.requireActiveTrip(tripId);
    TripExpenseReport report = requireReport(tripId);
    assertEditableByManager(report);
    assertTripAllowsExpenseEdit(trip);
    deleteReceipt(report, lineId);
    return toDto(report);
  }

  @Transactional
  public TripExpenseReportDto deleteReceiptForDriver(
      @NonNull String tripId, @NonNull String lineId, @NonNull String userId) {
    Trip trip = tripService.requireOwnedTrip(tripId, userId);
    TripExpenseReport report = requireReport(tripId);
    assertEditableByDriver(report);
    assertTripAllowsExpenseEdit(trip);
    deleteReceipt(report, lineId);
    return toDto(report);
  }

  @Transactional(readOnly = true)
  @NonNull
  public OpenedStoredFile openReceipt(@NonNull String tripId, @NonNull String lineId) {
    tripService.requireTrip(tripId);
    TripExpenseReport report = requireReport(tripId);
    TripExpenseLine line =
        Objects.requireNonNull(
            lineRepository
                .findByIdAndReportId(lineId, Objects.requireNonNull(report.getId()))
                .orElseThrow(() -> ApiException.notFound("Expense line not found")));
    if (!StringUtils.hasText(line.getStoredFileId())) {
      throw ApiException.notFound("Receipt not found");
    }
    String fileId = line.getStoredFileId();
    return storedFileService.open(Objects.requireNonNull(fileId));
  }

  @Transactional(readOnly = true)
  @NonNull
  public OpenedStoredFile openReceiptForDriver(
      @NonNull String tripId, @NonNull String lineId, @NonNull String userId) {
    tripService.requireOwnedTrip(tripId, userId);
    return openReceipt(tripId, lineId);
  }

  @Transactional
  public TripExpenseReportDto submit(@NonNull String tripId, @NonNull String userId) {
    Trip trip = tripService.requireActiveTrip(tripId);
    assertTripAllowsExpenseEdit(trip);
    TripExpenseReport report = requireReport(tripId);
    if (report.getStatus() != TripExpenseReportStatus.DRAFT
        && report.getStatus() != TripExpenseReportStatus.REJECTED) {
      throw ApiException.conflict("EXPENSE_REPORT_LOCKED", "Report cannot be submitted");
    }
    List<TripExpenseLine> lines =
        lineRepository.findByReportIdOrderBySortOrderAscCreatedAtAsc(
            Objects.requireNonNull(report.getId()));
    if (lines.isEmpty()) {
      throw ApiException.badRequest("VALIDATION_ERROR", "Cannot submit empty expense report");
    }
    report.setStatus(TripExpenseReportStatus.SUBMITTED);
    report.setSubmittedAt(Instant.now());
    report.setSubmittedByUserId(userId);
    report.setReviewedAt(null);
    report.setReviewedByUserId(null);
    report.setReviewComment(null);
    return toDto(Objects.requireNonNull(reportRepository.save(report)));
  }

  @Transactional
  public TripExpenseReportDto submitAsDriver(@NonNull String tripId, @NonNull String userId) {
    tripService.requireOwnedTrip(tripId, userId);
    return submit(tripId, userId);
  }

  @Transactional
  public TripExpenseReportDto review(
      @NonNull String tripId,
      @NonNull String reviewerUserId,
      @NonNull ReviewTripExpenseReportRequest request) {
    TripExpenseReport report = requireReport(tripId);
    tripService.requireActiveTrip(tripId);
    if (report.getStatus() != TripExpenseReportStatus.SUBMITTED) {
      throw ApiException.conflict(
          "EXPENSE_REPORT_LOCKED", "Only SUBMITTED reports can be reviewed");
    }
    report.setStatus(
        request.approved() ? TripExpenseReportStatus.APPROVED : TripExpenseReportStatus.REJECTED);
    report.setReviewedAt(Instant.now());
    report.setReviewedByUserId(reviewerUserId);
    String reviewComment = request.reviewComment();
    report.setReviewComment(
        reviewComment != null && !reviewComment.isBlank() ? reviewComment.trim() : null);
    return toDto(Objects.requireNonNull(reportRepository.save(report)));
  }

  @Transactional
  public TripExpenseReportDto reopen(@NonNull String tripId) {
    TripExpenseReport report = requireReport(tripId);
    tripService.requireActiveTrip(tripId);
    if (report.getStatus() != TripExpenseReportStatus.APPROVED) {
      throw ApiException.conflict("EXPENSE_REPORT_LOCKED", "Only APPROVED reports can be reopened");
    }
    report.setStatus(TripExpenseReportStatus.DRAFT);
    report.setReviewedAt(null);
    report.setReviewedByUserId(null);
    report.setReviewComment(null);
    report.setSubmittedAt(null);
    report.setSubmittedByUserId(null);
    return toDto(Objects.requireNonNull(reportRepository.save(report)));
  }

  private void replaceLines(TripExpenseReport report, List<TripExpenseLineInput> inputs) {
    String reportId = Objects.requireNonNull(report.getId());
    List<TripExpenseLineInput> lineInputs = Objects.requireNonNull(inputs);
    List<TripExpenseLine> existing =
        lineRepository.findByReportIdOrderBySortOrderAscCreatedAtAsc(reportId);
    Map<String, TripExpenseLine> byId = new HashMap<>();
    for (TripExpenseLine line : existing) {
      TripExpenseLine existingLine = Objects.requireNonNull(line);
      byId.put(Objects.requireNonNull(existingLine.getId()), existingLine);
    }
    Set<String> keepIds = new HashSet<>();
    List<TripExpenseLine> toSave = new ArrayList<>();
    int order = 0;
    for (TripExpenseLineInput input : lineInputs) {
      TripExpenseLineInput lineInput = Objects.requireNonNull(input);
      String currency =
          Objects.requireNonNull(
              Objects.requireNonNull(lineInput.currencyCode()).trim().toUpperCase(Locale.ROOT));
      if (!currencyRepository.existsById(currency)) {
        throw ApiException.badRequest("VALIDATION_ERROR", "Unknown currency: " + currency);
      }
      TripExpenseLine line;
      String existingId = lineInput.id();
      if (existingId != null && !existingId.isBlank() && byId.containsKey(existingId)) {
        line = Objects.requireNonNull(byId.get(existingId));
        keepIds.add(existingId);
      } else {
        line = new TripExpenseLine();
        line.setReportId(reportId);
      }
      line.setCategory(Objects.requireNonNull(lineInput.category()));
      line.setAmount(Objects.requireNonNull(lineInput.amount()));
      line.setCurrencyCode(currency);
      line.setExpenseDate(Objects.requireNonNull(lineInput.expenseDate()));
      String description = lineInput.description();
      line.setDescription(
          description != null && !description.isBlank() ? description.trim() : null);
      line.setSortOrder(order++);
      toSave.add(line);
    }
    for (TripExpenseLine old : existing) {
      TripExpenseLine oldLine = Objects.requireNonNull(old);
      if (!keepIds.contains(Objects.requireNonNull(oldLine.getId()))) {
        if (StringUtils.hasText(oldLine.getStoredFileId())) {
          storedFileService.delete(Objects.requireNonNull(oldLine.getStoredFileId()));
        }
        lineRepository.delete(oldLine);
      }
    }
    lineRepository.saveAll(Objects.requireNonNull(toSave));
    if (report.getStatus() == TripExpenseReportStatus.REJECTED) {
      report.setStatus(TripExpenseReportStatus.DRAFT);
      reportRepository.save(report);
    }
  }

  private void uploadReceipt(
      @NonNull TripExpenseReport report,
      @NonNull String lineId,
      @NonNull MultipartFile file,
      @NonNull String userId) {
    validateContentType(file);
    TripExpenseLine line =
        Objects.requireNonNull(
            lineRepository
                .findByIdAndReportId(lineId, Objects.requireNonNull(report.getId()))
                .orElseThrow(() -> ApiException.notFound("Expense line not found")));
    String relativeDir =
        "trip-expenses/" + Objects.requireNonNull(report.getTripId()) + "/" + lineId;
    StoredFileDto stored =
        Objects.requireNonNull(
            storedFileService.storeMultipart(file, Objects.requireNonNull(relativeDir), userId));
    if (StringUtils.hasText(line.getStoredFileId())) {
      storedFileService.delete(Objects.requireNonNull(line.getStoredFileId()));
    }
    line.setStoredFileId(Objects.requireNonNull(stored.id()));
    lineRepository.save(line);
  }

  private void deleteReceipt(@NonNull TripExpenseReport report, @NonNull String lineId) {
    TripExpenseLine line =
        Objects.requireNonNull(
            lineRepository
                .findByIdAndReportId(lineId, Objects.requireNonNull(report.getId()))
                .orElseThrow(() -> ApiException.notFound("Expense line not found")));
    if (StringUtils.hasText(line.getStoredFileId())) {
      storedFileService.delete(Objects.requireNonNull(line.getStoredFileId()));
      line.setStoredFileId(null);
      lineRepository.save(line);
    }
  }

  private void assertEditableByManager(TripExpenseReport report) {
    if (report.getStatus() == TripExpenseReportStatus.APPROVED
        || report.getStatus() == TripExpenseReportStatus.SUBMITTED) {
      throw ApiException.conflict(
          "EXPENSE_REPORT_LOCKED", "Report is locked until reopen or rejection");
    }
  }

  private void assertEditableByDriver(TripExpenseReport report) {
    if (report.getStatus() != TripExpenseReportStatus.DRAFT
        && report.getStatus() != TripExpenseReportStatus.REJECTED) {
      throw ApiException.conflict("EXPENSE_REPORT_LOCKED", "Driver cannot edit report now");
    }
  }

  private void assertTripAllowsExpenseEdit(Trip trip) {
    if (trip.getStatus() != TripStatus.IN_PROGRESS && trip.getStatus() != TripStatus.COMPLETED) {
      throw ApiException.conflict(
          "TRIP_LOCKED", "Expenses can be edited only for IN_PROGRESS or COMPLETED trips");
    }
  }

  @NonNull
  private TripExpenseReport requireReport(@NonNull String tripId) {
    return Objects.requireNonNull(
        reportRepository
            .findByTripId(tripId)
            .orElseThrow(() -> ApiException.notFound("Expense report not found")));
  }

  private void validateContentType(@NonNull MultipartFile file) {
    String contentType = file.getContentType();
    if (contentType == null
        || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase(Locale.ROOT))) {
      throw ApiException.badRequest(
          "VALIDATION_ERROR", "Allowed file types: image/jpeg, image/png, application/pdf");
    }
  }

  private TripExpenseReportDto toDto(TripExpenseReport report) {
    List<TripExpenseLine> lines =
        lineRepository.findByReportIdOrderBySortOrderAscCreatedAtAsc(
            Objects.requireNonNull(report.getId()));
    List<TripExpenseLineDto> lineDtos =
        lines.stream()
            .map(
                rawLine -> {
                  TripExpenseLine line = Objects.requireNonNull(rawLine);
                  StoredFileDto receipt = null;
                  if (StringUtils.hasText(line.getStoredFileId())) {
                    receipt =
                        storedFileService.getDto(Objects.requireNonNull(line.getStoredFileId()));
                  }
                  return new TripExpenseLineDto(
                      Objects.requireNonNull(line.getId()),
                      Objects.requireNonNull(line.getCategory()),
                      Objects.requireNonNull(line.getAmount()),
                      Objects.requireNonNull(line.getCurrencyCode()),
                      Objects.requireNonNull(line.getExpenseDate()),
                      line.getDescription(),
                      line.getStoredFileId(),
                      receipt,
                      line.getSortOrder());
                })
            .toList();
    return new TripExpenseReportDto(
        Objects.requireNonNull(report.getId()),
        Objects.requireNonNull(report.getTripId()),
        Objects.requireNonNull(report.getStatus()),
        report.getSubmittedAt(),
        report.getSubmittedByUserId(),
        report.getReviewedAt(),
        report.getReviewedByUserId(),
        report.getReviewComment(),
        lineDtos,
        report.getCreatedAt(),
        report.getUpdatedAt());
  }
}
