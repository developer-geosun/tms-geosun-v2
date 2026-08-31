package com.geosun.tms.reference.repository;

import com.geosun.tms.reference.domain.DocumentTypeReference;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DocumentTypeReferenceRepository
    extends JpaRepository<DocumentTypeReference, String> {

  List<DocumentTypeReference> findByDeletedFalseOrderByCountryCodeAscNameUkAsc();

  List<DocumentTypeReference> findByDeletedTrueOrderByCountryCodeAscNameUkAsc();

  List<DocumentTypeReference> findAllByOrderByCountryCodeAscNameUkAsc();

  boolean existsByCountryCodeIgnoreCaseAndNameUkIgnoreCaseAndDeletedFalse(
      String countryCode, String nameUk);

  boolean existsByCountryCodeIgnoreCaseAndNameUkIgnoreCaseAndDeletedFalseAndIdNot(
      String countryCode, String nameUk, String id);

  @Query(
      """
      SELECT d FROM DocumentTypeReference d
      WHERE d.deleted = false
        AND (:country IS NULL OR :country = '' OR UPPER(d.countryCode) = UPPER(:country))
        AND (
          :search IS NULL OR :search = '' OR
          LOWER(d.nameUk) LIKE CONCAT('%', LOWER(:search), '%') OR
          LOWER(d.nameEn) LIKE CONCAT('%', LOWER(:search), '%') OR
          LOWER(d.nameRu) LIKE CONCAT('%', LOWER(:search), '%')
        )
      ORDER BY d.countryCode ASC, d.nameUk ASC
      """)
  List<DocumentTypeReference> searchActive(
      @Param("search") String search, @Param("country") String country);

  @Query(
      """
      SELECT d FROM DocumentTypeReference d
      WHERE d.deleted = true
        AND (:country IS NULL OR :country = '' OR UPPER(d.countryCode) = UPPER(:country))
        AND (
          :search IS NULL OR :search = '' OR
          LOWER(d.nameUk) LIKE CONCAT('%', LOWER(:search), '%') OR
          LOWER(d.nameEn) LIKE CONCAT('%', LOWER(:search), '%') OR
          LOWER(d.nameRu) LIKE CONCAT('%', LOWER(:search), '%')
        )
      ORDER BY d.countryCode ASC, d.nameUk ASC
      """)
  List<DocumentTypeReference> searchDeleted(
      @Param("search") String search, @Param("country") String country);

  @Query(
      """
      SELECT d FROM DocumentTypeReference d
      WHERE (:country IS NULL OR :country = '' OR UPPER(d.countryCode) = UPPER(:country))
        AND (
          :search IS NULL OR :search = '' OR
          LOWER(d.nameUk) LIKE CONCAT('%', LOWER(:search), '%') OR
          LOWER(d.nameEn) LIKE CONCAT('%', LOWER(:search), '%') OR
          LOWER(d.nameRu) LIKE CONCAT('%', LOWER(:search), '%')
        )
      ORDER BY d.countryCode ASC, d.nameUk ASC
      """)
  List<DocumentTypeReference> searchAll(
      @Param("search") String search, @Param("country") String country);
}
