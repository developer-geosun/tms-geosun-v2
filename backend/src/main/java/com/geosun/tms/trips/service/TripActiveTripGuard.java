package com.geosun.tms.trips.service;

import com.geosun.tms.reference.service.ActiveTripGuard;
import com.geosun.tms.trips.domain.TripStatus;
import com.geosun.tms.trips.repository.TripRepository;
import java.util.EnumSet;
import java.util.Set;
import org.springframework.context.annotation.Primary;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;

@Primary
@Component
public class TripActiveTripGuard implements ActiveTripGuard {

  private static final Set<TripStatus> ACTIVE =
      EnumSet.of(TripStatus.PLANNED, TripStatus.IN_PROGRESS);

  private final TripRepository tripRepository;

  public TripActiveTripGuard(TripRepository tripRepository) {
    this.tripRepository = tripRepository;
  }

  @Override
  public boolean hasActiveTripForDriver(@NonNull String driverId) {
    return tripRepository.existsActiveByDriver(driverId, ACTIVE);
  }

  @Override
  public boolean hasActiveTripForCombination(@NonNull String combinationId) {
    return tripRepository.existsActiveByCombination(combinationId, ACTIVE);
  }

  @Override
  public boolean hasActiveTripForVehicle(@NonNull String vehicleId) {
    return tripRepository.existsActiveByVehicle(vehicleId, ACTIVE);
  }
}
