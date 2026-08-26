package com.geosun.tms.reference.domain;

/** Статус дії документа (обчислюється від поточної версії). */
public enum VehicleDocumentStatus {
  VALID,
  EXPIRING_SOON,
  EXPIRED,
  MISSING
}
