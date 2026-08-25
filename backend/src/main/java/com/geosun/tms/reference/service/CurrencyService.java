package com.geosun.tms.reference.service;

import com.geosun.tms.auth.exception.ApiException;
import com.geosun.tms.reference.domain.Currency;
import com.geosun.tms.reference.domain.CurrencyNbuRate;
import com.geosun.tms.reference.dto.request.UpdateCurrencyRequest;
import com.geosun.tms.reference.dto.response.CurrencyDto;
import com.geosun.tms.reference.repository.CurrencyNbuRateRepository;
import com.geosun.tms.reference.repository.CurrencyRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CurrencyService {
  private final CurrencyRepository currencyRepository;
  private final CurrencyNbuRateRepository nbuRateRepository;

  public CurrencyService(
      CurrencyRepository currencyRepository, CurrencyNbuRateRepository nbuRateRepository) {
    this.currencyRepository = currencyRepository;
    this.nbuRateRepository = nbuRateRepository;
  }

  @Transactional(readOnly = true)
  public List<CurrencyDto> list(boolean activeOnly) {
    List<Currency> currencies =
        activeOnly ? currencyRepository.findActiveOrdered() : currencyRepository.findAllOrdered();
    Map<String, LatestRateView> latestByCode = loadLatestRatesByCode();
    return currencies.stream().map(c -> toDto(c, latestByCode.get(c.getCode()))).toList();
  }

  @Transactional
  public CurrencyDto update(String code, UpdateCurrencyRequest request) {
    Currency currency = loadCurrency(code);
    currency.setActive(request.isActive());
    if (request.displayOrder() != null) {
      currency.setDisplayOrder(request.displayOrder());
    }
    Map<String, LatestRateView> latestByCode = loadLatestRatesByCode();
    return toDto(currencyRepository.save(currency), latestByCode.get(currency.getCode()));
  }

  private Currency loadCurrency(String code) {
    String normalized = normalizeCode(code);
    if (normalized == null) {
      throw new IllegalStateException("currency code must not be null");
    }
    return currencyRepository
        .findById(normalized)
        .orElseThrow(() -> ApiException.notFound("Валюту не знайдено: " + normalized));
  }

  private Map<String, LatestRateView> loadLatestRatesByCode() {
    Map<String, LatestRateView> result = new HashMap<>();
    nbuRateRepository
        .findLatestRateDate()
        .ifPresent(
            latestDate -> {
              for (CurrencyNbuRate rate :
                  nbuRateRepository.findByRateDateOrderByCurrencyCodeAsc(latestDate)) {
                result.put(
                    rate.getCurrencyCode(), new LatestRateView(rate.getRatePerUnit(), latestDate));
              }
            });
    return result;
  }

  private static CurrencyDto toDto(Currency currency, LatestRateView latest) {
    BigDecimal ratePerUnit = latest != null ? latest.ratePerUnit() : null;
    LocalDate rateDate = latest != null ? latest.rateDate() : null;
    return new CurrencyDto(
        currency.getCode(),
        currency.getNumericCode(),
        currency.getNameUk(),
        currency.getNameEn(),
        currency.getNbuUnits(),
        currency.getMinorUnits(),
        currency.isActive(),
        currency.getDisplayOrder(),
        ratePerUnit,
        rateDate);
  }

  private static String normalizeCode(String code) {
    if (code == null || code.isBlank()) {
      throw ApiException.badRequest("VALIDATION_ERROR", "Код валюти обов'язковий");
    }
    return code.trim().toUpperCase();
  }

  private record LatestRateView(BigDecimal ratePerUnit, LocalDate rateDate) {}
}
