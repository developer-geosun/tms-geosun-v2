package com.geosun.tms.reference.domain;

import java.util.Locale;
import org.springframework.lang.NonNull;

/** Тип документа транспортного засобу. */
public enum VehicleDocumentType {
  THIRD_PARTY_LIABILITY,
  GREEN_CARD,
  TECHNICAL_INSPECTION,
  WHITE_CERTIFICATE,
  TACHOGRAPH_VERIFICATION,
  REFRIGERATOR_VERIFICATION;

  @NonNull
  public static VehicleDocumentType fromPath(String raw) {
    if (raw == null || raw.isBlank()) {
      throw new IllegalArgumentException("document type is required");
    }
    String normalized = raw.trim().toUpperCase(Locale.ROOT).replace('-', '_');
    try {
      return VehicleDocumentType.valueOf(normalized);
    } catch (IllegalArgumentException ex) {
      throw new IllegalArgumentException("Invalid document type: " + raw);
    }
  }
}
