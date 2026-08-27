package com.geosun.tms.reference.repository;

import com.geosun.tms.reference.domain.VehicleCombination;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VehicleCombinationRepository extends JpaRepository<VehicleCombination, String> {

  List<VehicleCombination> findByDeletedFalseOrderByNameAscCreatedAtAsc();

  List<VehicleCombination> findByDeletedTrueOrderByNameAscCreatedAtAsc();

  List<VehicleCombination> findAllByOrderByNameAscCreatedAtAsc();

  boolean existsByTractor_IdAndTrailer_IdAndDeletedFalse(String tractorId, String trailerId);

  boolean existsByTractor_IdAndTrailer_IdAndDeletedFalseAndIdNot(
      String tractorId, String trailerId, String id);

  Optional<VehicleCombination> findByIdAndDeletedFalse(String id);
}
