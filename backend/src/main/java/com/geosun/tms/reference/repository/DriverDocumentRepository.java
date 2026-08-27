package com.geosun.tms.reference.repository;

import com.geosun.tms.reference.domain.DriverDocument;
import com.geosun.tms.reference.domain.DriverDocumentType;
import com.geosun.tms.reference.domain.RegistrationScanSide;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DriverDocumentRepository extends JpaRepository<DriverDocument, String> {

  List<DriverDocument> findByDriver_IdOrderByDocumentTypeAscSideAscCreatedAtDesc(String driverId);

  Optional<DriverDocument> findByIdAndDriver_Id(String id, String driverId);

  Optional<DriverDocument> findFirstByDriver_IdAndDocumentTypeAndSideOrderByCreatedAtDesc(
      String driverId, DriverDocumentType documentType, RegistrationScanSide side);
}
