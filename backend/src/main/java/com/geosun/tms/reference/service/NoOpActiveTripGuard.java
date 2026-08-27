package com.geosun.tms.reference.service;

import org.springframework.lang.NonNull;

/** Заглушка ActiveTripGuard, якщо пакет trips ще не підключений. */
public class NoOpActiveTripGuard implements ActiveTripGuard {

  @Override
  public boolean hasActiveTripForDriver(@NonNull String driverId) {
    return false;
  }

  @Override
  public boolean hasActiveTripForCombination(@NonNull String combinationId) {
    return false;
  }

  @Override
  public boolean hasActiveTripForVehicle(@NonNull String vehicleId) {
    return false;
  }
}
