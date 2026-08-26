package com.geosun.tms.reference.domain;

import org.springframework.lang.NonNull;

/** Сторона скану свідоцтва про реєстрацію. */
public enum RegistrationScanSide {
  FRONT,
  BACK;

  @NonNull
  public static RegistrationScanSide fromPath(String raw) {
    if (raw == null || raw.isBlank()) {
      throw new IllegalArgumentException("side is required");
    }
    return switch (raw.trim().toLowerCase()) {
      case "front" -> FRONT;
      case "back" -> BACK;
      default -> throw new IllegalArgumentException("Invalid side; expected front or back");
    };
  }
}
