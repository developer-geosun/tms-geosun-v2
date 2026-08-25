package com.geosun.tms.freight.cost.repository;

import com.geosun.tms.freight.cost.domain.FreightNumericScenario;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FreightNumericScenarioRepository
    extends JpaRepository<FreightNumericScenario, String> {
  List<FreightNumericScenario> findByActiveTrueOrderByNameAsc();

  List<FreightNumericScenario> findAllByOrderByNameAsc();

  Optional<FreightNumericScenario> findByNameIgnoreCaseAndActiveTrue(String name);

  boolean existsByNameIgnoreCaseAndActiveTrueAndIdNot(String name, String excludeId);

  boolean existsByTollTariffSet_IdAndActiveTrue(String tollTariffSetId);

  boolean existsByTollTariffSet_Id(String tollTariffSetId);
}
