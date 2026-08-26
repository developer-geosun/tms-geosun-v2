package com.geosun.tms.reference.service;

import com.geosun.tms.reference.domain.VehicleDocumentStatus;
import com.geosun.tms.reference.domain.VehicleDocumentType;
import com.geosun.tms.reference.domain.VehicleType;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import org.springframework.lang.NonNull;
import org.springframework.lang.Nullable;

/** Правила обов'язковості та статусів документів ТС. */
public final class VehicleDocumentRules {

  /** Днів до закінчення для статусу EXPIRING_SOON. */
  public static final int EXPIRING_SOON_DAYS = 30;

  private VehicleDocumentRules() {}

  @NonNull
  public static Set<VehicleDocumentType> requiredTypes(
      @NonNull VehicleType vehicleType, boolean hasRefrigerator) {
    EnumSet<VehicleDocumentType> required =
        EnumSet.of(
            VehicleDocumentType.THIRD_PARTY_LIABILITY,
            VehicleDocumentType.GREEN_CARD,
            VehicleDocumentType.TECHNICAL_INSPECTION);
    if (vehicleType == VehicleType.SEMI_TRACTOR) {
      required.add(VehicleDocumentType.WHITE_CERTIFICATE);
      required.add(VehicleDocumentType.TACHOGRAPH_VERIFICATION);
    }
    if (vehicleType == VehicleType.SEMI_TRAILER && hasRefrigerator) {
      required.add(VehicleDocumentType.REFRIGERATOR_VERIFICATION);
    }
    // EnumSet.of не анотовано @NonNull у JDK — явна перевірка для Eclipse null analysis
    return Objects.requireNonNull(required);
  }

  public static boolean isAllowedForVehicle(
      @NonNull VehicleDocumentType type,
      @NonNull VehicleType vehicleType,
      boolean hasRefrigerator) {
    return requiredTypes(vehicleType, hasRefrigerator).contains(type);
  }

  @NonNull
  public static VehicleDocumentStatus statusOf(
      @Nullable LocalDate validTo, @NonNull LocalDate today) {
    if (validTo == null) {
      return VehicleDocumentStatus.MISSING;
    }
    if (validTo.isBefore(today)) {
      return VehicleDocumentStatus.EXPIRED;
    }
    LocalDate soonThreshold = today.plusDays(EXPIRING_SOON_DAYS);
    if (!validTo.isAfter(soonThreshold)) {
      return VehicleDocumentStatus.EXPIRING_SOON;
    }
    return VehicleDocumentStatus.VALID;
  }

  @NonNull
  public static List<VehicleDocumentType> asOrderedList(@NonNull Set<VehicleDocumentType> types) {
    List<VehicleDocumentType> ordered = new ArrayList<>();
    for (VehicleDocumentType type : VehicleDocumentType.values()) {
      if (types.contains(type)) {
        ordered.add(type);
      }
    }
    return ordered;
  }
}
