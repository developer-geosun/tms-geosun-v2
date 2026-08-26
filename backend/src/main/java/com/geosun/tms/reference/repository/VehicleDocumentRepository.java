package com.geosun.tms.reference.repository;

import com.geosun.tms.reference.domain.VehicleDocument;
import com.geosun.tms.reference.domain.VehicleDocumentType;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VehicleDocumentRepository extends JpaRepository<VehicleDocument, String> {

  List<VehicleDocument> findByVehicle_IdOrderByDocumentTypeAscCreatedAtDesc(String vehicleId);

  List<VehicleDocument> findByVehicle_IdAndDocumentTypeOrderByCreatedAtDesc(
      String vehicleId, VehicleDocumentType documentType);

  List<VehicleDocument> findByVehicle_IdIn(Collection<String> vehicleIds);
}
