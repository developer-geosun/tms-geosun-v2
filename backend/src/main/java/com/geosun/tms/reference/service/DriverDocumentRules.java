package com.geosun.tms.reference.service;

import com.geosun.tms.reference.domain.DriverDocumentStatus;
import com.geosun.tms.reference.domain.DriverDocumentType;
import com.geosun.tms.reference.domain.RegistrationScanSide;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import org.springframework.lang.NonNull;
import org.springframework.lang.Nullable;

/** Правила обов'язковості та статусів документів водія. */
public final class DriverDocumentRules {

  public static final int EXPIRING_SOON_DAYS = 30;

  private DriverDocumentRules() {}

  @NonNull
  public static List<DocumentSlot> requiredSlots() {
    List<DocumentSlot> slots = new ArrayList<>();
    for (DriverDocumentType type : DriverDocumentType.values()) {
      slots.add(new DocumentSlot(type, RegistrationScanSide.FRONT));
      slots.add(new DocumentSlot(type, RegistrationScanSide.BACK));
    }
    return slots;
  }

  @NonNull
  public static DriverDocumentStatus statusOf(
      @Nullable LocalDate validTo, @NonNull LocalDate today) {
    if (validTo == null) {
      return DriverDocumentStatus.MISSING;
    }
    if (validTo.isBefore(today)) {
      return DriverDocumentStatus.EXPIRED;
    }
    LocalDate soonThreshold = today.plusDays(EXPIRING_SOON_DAYS);
    if (!validTo.isAfter(soonThreshold)) {
      return DriverDocumentStatus.EXPIRING_SOON;
    }
    return DriverDocumentStatus.VALID;
  }

  public record DocumentSlot(DriverDocumentType type, RegistrationScanSide side) {}
}
