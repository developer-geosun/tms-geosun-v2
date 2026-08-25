package com.geosun.tms.reference.repository;

import com.geosun.tms.reference.domain.CountryReference;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CountryReferenceRepository extends JpaRepository<CountryReference, String> {
  List<CountryReference> findAllByOrderByCodeAlpha2Asc();

  @Query(
      """
      SELECT c FROM CountryReference c
      WHERE :search IS NULL OR :search = '' OR
            UPPER(c.codeAlpha2) LIKE CONCAT('%', UPPER(:search), '%') OR
            UPPER(c.codeAlpha3) LIKE CONCAT('%', UPPER(:search), '%') OR
            LOWER(c.nameUk) LIKE CONCAT('%', LOWER(:search), '%') OR
            LOWER(c.nameEn) LIKE CONCAT('%', LOWER(:search), '%') OR
            LOWER(c.nameRu) LIKE CONCAT('%', LOWER(:search), '%')
      ORDER BY c.codeAlpha2 ASC
      """)
  List<CountryReference> search(@Param("search") String search);

  Optional<CountryReference> findByCodeAlpha2IgnoreCase(String codeAlpha2);
}
