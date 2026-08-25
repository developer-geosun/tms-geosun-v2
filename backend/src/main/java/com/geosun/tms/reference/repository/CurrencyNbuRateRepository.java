package com.geosun.tms.reference.repository;

import com.geosun.tms.reference.domain.CurrencyNbuRate;
import com.geosun.tms.reference.domain.CurrencyNbuRateId;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CurrencyNbuRateRepository
    extends JpaRepository<CurrencyNbuRate, CurrencyNbuRateId> {
  @Query("SELECT MAX(r.rateDate) FROM CurrencyNbuRate r")
  Optional<LocalDate> findLatestRateDate();

  List<CurrencyNbuRate> findByRateDateAndCurrencyCodeIn(
      LocalDate rateDate, Collection<String> currencyCodes);

  List<CurrencyNbuRate> findByRateDateOrderByCurrencyCodeAsc(LocalDate rateDate);

  @Query(
      value =
          """
          SELECT rate_date FROM (
            SELECT r.rate_date AS rate_date, COUNT(DISTINCT r.currency_code) AS cnt
            FROM currency_nbu_rates r
            WHERE r.rate_date <= :onOrBefore
            GROUP BY r.rate_date
            HAVING cnt >= :requiredCount
            ORDER BY r.rate_date DESC
            LIMIT 1
          ) latest_complete
          """,
      nativeQuery = true)
  Optional<LocalDate> findLatestCompleteRateDateOnOrBefore(
      @Param("onOrBefore") LocalDate onOrBefore, @Param("requiredCount") long requiredCount);
}
