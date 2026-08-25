package com.geosun.tms.reference.service;

import com.geosun.tms.auth.exception.ApiException;
import com.geosun.tms.reference.domain.CountryReference;
import com.geosun.tms.reference.dto.response.CountryReferenceDto;
import com.geosun.tms.reference.repository.CountryReferenceRepository;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CountryReferenceService {
  private final CountryReferenceRepository countryReferenceRepository;

  public CountryReferenceService(CountryReferenceRepository countryReferenceRepository) {
    this.countryReferenceRepository = countryReferenceRepository;
  }

  @Transactional(readOnly = true)
  public List<CountryReferenceDto> list(String search) {
    String normalizedSearch = normalizeSearch(search);
    List<CountryReference> countries =
        normalizedSearch == null
            ? countryReferenceRepository.findAllByOrderByCodeAlpha2Asc()
            : countryReferenceRepository.search(normalizedSearch);
    return countries.stream().map(this::toDto).toList();
  }

  @Transactional(readOnly = true)
  public CountryReferenceDto getByCodeAlpha2(String codeAlpha2) {
    String code = normalizeAlpha2(codeAlpha2);
    CountryReference country =
        countryReferenceRepository
            .findByCodeAlpha2IgnoreCase(code)
            .orElseThrow(() -> ApiException.notFound("Країну не знайдено: " + code));
    return toDto(country);
  }

  private CountryReferenceDto toDto(CountryReference country) {
    return new CountryReferenceDto(
        country.getCodeAlpha2(),
        country.getCodeAlpha3(),
        country.getNameUk(),
        country.getNameEn(),
        country.getNameRu());
  }

  private static String normalizeAlpha2(String codeAlpha2) {
    if (codeAlpha2 == null || codeAlpha2.isBlank()) {
      throw ApiException.badRequest("VALIDATION_ERROR", "codeAlpha2 is required");
    }
    return codeAlpha2.trim().toUpperCase(Locale.ROOT);
  }

  private static String normalizeSearch(String search) {
    if (search == null) {
      return null;
    }
    String trimmed = search.trim();
    return trimmed.isEmpty() ? null : trimmed;
  }

  /** Нормалізація коду країни для збереження в тарифах (alpha-2, UPPERCASE). */
  public static String normalizeCountryCode(String countryCode) {
    return Objects.requireNonNull(countryCode, "countryCode").trim().toUpperCase(Locale.ROOT);
  }
}
