package com.geosun.tms.freight.cost.repository;

import com.geosun.tms.freight.cost.domain.CountryTollRule;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CountryTollRuleRepository extends JpaRepository<CountryTollRule, String> {
  List<CountryTollRule> findByTollTariffSet_IdAndActiveTrueOrderByCountryCodeAsc(String setId);

  List<CountryTollRule> findByTollTariffSet_IdOrderByCountryCodeAsc(String setId);

  Optional<CountryTollRule> findByTollTariffSet_IdAndCountryCode(String setId, String countryCode);

  boolean existsByTollTariffSet_IdAndCountryCodeAndIdNot(
      String setId, String countryCode, String excludeId);
}
