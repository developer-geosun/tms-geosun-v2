package com.geosun.tms.reference.repository;

import com.geosun.tms.reference.domain.Currency;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface CurrencyRepository extends JpaRepository<Currency, String> {
  @Query(
      """
      SELECT c FROM Currency c
      WHERE c.active = true
      ORDER BY CASE WHEN c.displayOrder IS NULL THEN 1 ELSE 0 END,
               c.displayOrder ASC, c.code ASC
      """)
  List<Currency> findActiveOrdered();

  @Query(
      """
      SELECT c FROM Currency c
      ORDER BY CASE WHEN c.displayOrder IS NULL THEN 1 ELSE 0 END,
               c.displayOrder ASC, c.code ASC
      """)
  List<Currency> findAllOrdered();
}
