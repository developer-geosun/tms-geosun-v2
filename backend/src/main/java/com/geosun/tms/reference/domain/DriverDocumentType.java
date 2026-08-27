package com.geosun.tms.reference.domain;

import java.util.Locale;
import java.util.Objects;
import org.springframework.lang.NonNull;

/** Тип кадрового документа водія. */
public enum DriverDocumentType {
  PASSPORT,
  DRIVER_LICENSE;

  @NonNull
  public static DriverDocumentType fromPath(String raw) {
    if (raw == null || raw.isBlank()) {
      throw new IllegalArgumentException("document type is required");
    }
    String normalized = raw.trim().toUpperCase(Locale.ROOT).replace('-', '_');
    try {
      return Objects.requireNonNull(DriverDocumentType.valueOf(normalized));
    } catch (IllegalArgumentException ex) {
      throw new IllegalArgumentException("Invalid document type: " + raw);
    }
  }
}
