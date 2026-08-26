package com.geosun.tms.reference.repository;

import com.geosun.tms.reference.domain.RegistrationScanSide;
import com.geosun.tms.reference.domain.VehicleRegistrationScan;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VehicleRegistrationScanRepository
    extends JpaRepository<VehicleRegistrationScan, String> {

  List<VehicleRegistrationScan> findByVehicle_Id(String vehicleId);

  Optional<VehicleRegistrationScan> findByVehicle_IdAndSide(
      String vehicleId, RegistrationScanSide side);
}
