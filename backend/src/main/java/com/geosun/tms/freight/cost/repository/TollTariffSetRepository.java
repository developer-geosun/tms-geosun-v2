package com.geosun.tms.freight.cost.repository;

import com.geosun.tms.freight.cost.domain.TollTariffSet;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TollTariffSetRepository extends JpaRepository<TollTariffSet, String> {
  List<TollTariffSet> findByActiveTrueOrderByNameAsc();

  List<TollTariffSet> findAllByOrderByNameAsc();

  Optional<TollTariffSet> findByNameIgnoreCaseAndActiveTrue(String name);

  boolean existsByNameIgnoreCaseAndActiveTrueAndIdNot(String name, String id);
}
