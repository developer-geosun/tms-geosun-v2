package com.geosun.tms.reference.service;

import com.geosun.tms.auth.exception.ApiException;
import com.geosun.tms.reference.domain.Vehicle;
import com.geosun.tms.reference.domain.VehicleCombination;
import com.geosun.tms.reference.domain.VehicleCombinationListView;
import com.geosun.tms.reference.domain.VehicleType;
import com.geosun.tms.reference.dto.request.CreateVehicleCombinationRequest;
import com.geosun.tms.reference.dto.request.UpdateVehicleCombinationRequest;
import com.geosun.tms.reference.dto.response.VehicleCombinationDto;
import com.geosun.tms.reference.repository.VehicleCombinationRepository;
import com.geosun.tms.reference.repository.VehicleRepository;
import java.time.Instant;
import java.util.List;
import java.util.Objects;
import org.springframework.lang.NonNull;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class VehicleCombinationService {

  private final VehicleCombinationRepository combinationRepository;
  private final VehicleRepository vehicleRepository;
  private final ActiveTripGuard activeTripGuard;

  public VehicleCombinationService(
      VehicleCombinationRepository combinationRepository,
      VehicleRepository vehicleRepository,
      ActiveTripGuard activeTripGuard) {
    this.combinationRepository = combinationRepository;
    this.vehicleRepository = vehicleRepository;
    this.activeTripGuard = activeTripGuard;
  }

  @Transactional(readOnly = true)
  public List<VehicleCombinationDto> list(VehicleCombinationListView view) {
    List<VehicleCombination> items =
        switch (view == null ? VehicleCombinationListView.ACTIVE : view) {
          case ACTIVE -> combinationRepository.findByDeletedFalseOrderByNameAscCreatedAtAsc();
          case DELETED -> combinationRepository.findByDeletedTrueOrderByNameAscCreatedAtAsc();
          case ALL -> combinationRepository.findAllByOrderByNameAscCreatedAtAsc();
        };
    return items.stream().map(c -> toDto(Objects.requireNonNull(c))).toList();
  }

  @Transactional(readOnly = true)
  public VehicleCombinationDto getById(@NonNull String id) {
    return toDto(requireCombination(id));
  }

  @Transactional
  public VehicleCombinationDto create(@NonNull CreateVehicleCombinationRequest request) {
    Vehicle tractor =
        requireActiveVehicleOfType(
            Objects.requireNonNull(request.tractorId()), VehicleType.SEMI_TRACTOR);
    Vehicle trailer =
        requireActiveVehicleOfType(
            Objects.requireNonNull(request.trailerId()), VehicleType.SEMI_TRAILER);
    assertUniquePair(
        Objects.requireNonNull(tractor.getId()), Objects.requireNonNull(trailer.getId()), null);

    VehicleCombination combination = new VehicleCombination();
    combination.setName(normalizeName(request.name()));
    combination.setTractor(tractor);
    combination.setTrailer(trailer);
    return toDto(Objects.requireNonNull(combinationRepository.save(combination)));
  }

  @Transactional
  public VehicleCombinationDto update(
      @NonNull String id, @NonNull UpdateVehicleCombinationRequest request) {
    VehicleCombination combination = requireActiveCombination(id);
    Vehicle tractor =
        requireActiveVehicleOfType(
            Objects.requireNonNull(request.tractorId()), VehicleType.SEMI_TRACTOR);
    Vehicle trailer =
        requireActiveVehicleOfType(
            Objects.requireNonNull(request.trailerId()), VehicleType.SEMI_TRAILER);
    assertUniquePair(
        Objects.requireNonNull(tractor.getId()), Objects.requireNonNull(trailer.getId()), id);
    combination.setName(normalizeName(request.name()));
    combination.setTractor(tractor);
    combination.setTrailer(trailer);
    return toDto(Objects.requireNonNull(combinationRepository.save(combination)));
  }

  @Transactional
  public void softDelete(@NonNull String id) {
    VehicleCombination combination = requireCombination(id);
    if (combination.isDeleted()) {
      return;
    }
    if (activeTripGuard.hasActiveTripForCombination(id)) {
      throw ApiException.conflict(
          "COMBINATION_IN_ACTIVE_TRIP",
          "Vehicle combination is used in an active trip and cannot be deleted");
    }
    combination.setDeleted(true);
    combination.setDeletedAt(Instant.now());
    combinationRepository.save(combination);
  }

  @Transactional
  public VehicleCombinationDto restore(@NonNull String id) {
    VehicleCombination combination = requireCombination(id);
    if (!combination.isDeleted()) {
      return toDto(combination);
    }
    Vehicle tractor = Objects.requireNonNull(combination.getTractor());
    Vehicle trailer = Objects.requireNonNull(combination.getTrailer());
    if (tractor.isDeleted() || trailer.isDeleted()) {
      throw ApiException.conflict(
          "VEHICLE_DELETED", "Cannot restore combination with deleted tractor or trailer");
    }
    assertUniquePair(
        Objects.requireNonNull(tractor.getId()), Objects.requireNonNull(trailer.getId()), id);
    combination.setDeleted(false);
    combination.setDeletedAt(null);
    return toDto(Objects.requireNonNull(combinationRepository.save(combination)));
  }

  @NonNull
  public VehicleCombination requireCombination(@NonNull String id) {
    return Objects.requireNonNull(
        combinationRepository
            .findById(id)
            .orElseThrow(() -> ApiException.notFound("Vehicle combination not found")));
  }

  @NonNull
  public VehicleCombination requireActiveCombination(@NonNull String id) {
    VehicleCombination combination = requireCombination(id);
    if (combination.isDeleted()) {
      throw ApiException.conflict("COMBINATION_DELETED", "Vehicle combination is deleted");
    }
    return combination;
  }

  @NonNull
  private Vehicle requireActiveVehicleOfType(
      @NonNull String vehicleId, @NonNull VehicleType expectedType) {
    Vehicle vehicle =
        Objects.requireNonNull(
            vehicleRepository
                .findByIdAndDeletedFalse(vehicleId)
                .orElseThrow(() -> ApiException.notFound("Vehicle not found")));
    if (vehicle.getVehicleType() != expectedType) {
      throw ApiException.conflict(
          "INVALID_VEHICLE_TYPE",
          "Expected vehicle type " + expectedType + " but got " + vehicle.getVehicleType());
    }
    return vehicle;
  }

  private void assertUniquePair(
      @NonNull String tractorId, @NonNull String trailerId, @Nullable String excludeId) {
    boolean exists =
        excludeId == null
            ? combinationRepository.existsByTractor_IdAndTrailer_IdAndDeletedFalse(
                tractorId, trailerId)
            : combinationRepository.existsByTractor_IdAndTrailer_IdAndDeletedFalseAndIdNot(
                tractorId, trailerId, excludeId);
    if (exists) {
      throw ApiException.conflict(
          "COMBINATION_PAIR_EXISTS",
          "Active combination with this tractor and trailer already exists");
    }
  }

  @Nullable
  private String normalizeName(@Nullable String name) {
    if (name == null || name.isBlank()) {
      return null;
    }
    return name.trim();
  }

  private VehicleCombinationDto toDto(VehicleCombination combination) {
    Vehicle tractor = Objects.requireNonNull(combination.getTractor());
    Vehicle trailer = Objects.requireNonNull(combination.getTrailer());
    return new VehicleCombinationDto(
        Objects.requireNonNull(combination.getId()),
        combination.getName(),
        Objects.requireNonNull(tractor.getId()),
        Objects.requireNonNull(tractor.getPlateNumber()),
        Objects.requireNonNull(trailer.getId()),
        Objects.requireNonNull(trailer.getPlateNumber()),
        combination.isDeleted(),
        combination.getDeletedAt(),
        combination.getCreatedAt(),
        combination.getUpdatedAt());
  }
}
