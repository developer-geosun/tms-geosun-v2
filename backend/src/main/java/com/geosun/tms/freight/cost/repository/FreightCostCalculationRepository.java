package com.geosun.tms.freight.cost.repository;

import com.geosun.tms.freight.cost.domain.FreightCostCalculation;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FreightCostCalculationRepository
    extends JpaRepository<FreightCostCalculation, String> {
  List<FreightCostCalculation> findByRouteRequest_IdOrderByCreatedAtDesc(Long routeRequestId);

  Optional<FreightCostCalculation> findByIdAndRouteRequest_Id(String id, Long routeRequestId);

  boolean existsByScenario_Id(String scenarioId);
}
