package com.geosun.tms.reference.repository;

import com.geosun.tms.reference.domain.Driver;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DriverRepository extends JpaRepository<Driver, String> {

  List<Driver> findByDeletedFalseOrderByLastNameAscFirstNameAsc();

  List<Driver> findByDeletedTrueOrderByLastNameAscFirstNameAsc();

  List<Driver> findAllByOrderByLastNameAscFirstNameAsc();

  boolean existsByLicenseNumberIgnoreCaseAndDeletedFalse(String licenseNumber);

  boolean existsByLicenseNumberIgnoreCaseAndDeletedFalseAndIdNot(String licenseNumber, String id);

  Optional<Driver> findByIdAndDeletedFalse(String id);

  Optional<Driver> findByUserId(String userId);

  boolean existsByUserId(String userId);
}
