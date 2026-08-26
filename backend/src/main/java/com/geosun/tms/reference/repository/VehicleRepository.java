package com.geosun.tms.reference.repository;

import com.geosun.tms.reference.domain.Vehicle;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VehicleRepository extends JpaRepository<Vehicle, String> {

  List<Vehicle> findByDeletedFalseOrderByPlateNumberAsc();

  List<Vehicle> findByDeletedTrueOrderByPlateNumberAsc();

  List<Vehicle> findAllByOrderByPlateNumberAsc();

  boolean existsByPlateNumberIgnoreCaseAndDeletedFalseAndIdNot(String plateNumber, String id);

  boolean existsByPlateNumberIgnoreCaseAndDeletedFalse(String plateNumber);

  boolean existsByVinIgnoreCaseAndDeletedFalseAndIdNot(String vin, String id);

  boolean existsByVinIgnoreCaseAndDeletedFalse(String vin);

  boolean
      existsByRegistrationSeriesIgnoreCaseAndRegistrationNumberIgnoreCaseAndDeletedFalseAndIdNot(
          String series, String number, String id);

  boolean existsByRegistrationSeriesIgnoreCaseAndRegistrationNumberIgnoreCaseAndDeletedFalse(
      String series, String number);

  Optional<Vehicle> findByIdAndDeletedFalse(String id);
}
