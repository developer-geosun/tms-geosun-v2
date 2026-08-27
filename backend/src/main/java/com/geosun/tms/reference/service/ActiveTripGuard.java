package com.geosun.tms.reference.service;

import org.springframework.lang.NonNull;

/** Перевірка активних рейсів для soft-delete довідників (реалізація в пакеті trips). */
public interface ActiveTripGuard {

  boolean hasActiveTripForDriver(@NonNull String driverId);

  boolean hasActiveTripForCombination(@NonNull String combinationId);

  boolean hasActiveTripForVehicle(@NonNull String vehicleId);
}
