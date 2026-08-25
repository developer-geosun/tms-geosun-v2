package com.geosun.tms.reference.service;

import com.geosun.tms.auth.exception.ApiException;
import com.geosun.tms.reference.client.NbuRateRow;
import com.geosun.tms.reference.domain.Currency;
import com.geosun.tms.reference.domain.CurrencyNbuRate;
import com.geosun.tms.reference.dto.response.NbuRateDto;
import com.geosun.tms.reference.dto.response.NbuRatesSnapshotDto;
import com.geosun.tms.reference.dto.response.SyncNbuRatesResponse;
import com.geosun.tms.reference.repository.CurrencyNbuRateRepository;
import com.geosun.tms.reference.repository.CurrencyRepository;
import com.geosun.tms.reference.service.NbuBusinessDayResolver.ResolvedNbuSnapshot;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NbuExchangeRateService {
  private static final String BASE_CURRENCY = "UAH";

  private final CurrencyRepository currencyRepository;
  private final CurrencyNbuRateRepository nbuRateRepository;
  private final NbuBusinessDayResolver businessDayResolver;

  public NbuExchangeRateService(
      CurrencyRepository currencyRepository,
      CurrencyNbuRateRepository nbuRateRepository,
      NbuBusinessDayResolver businessDayResolver) {
    this.currencyRepository = currencyRepository;
    this.nbuRateRepository = nbuRateRepository;
    this.businessDayResolver = businessDayResolver;
  }

  @Transactional
  public SyncNbuRatesResponse syncActiveCurrencies() {
    List<Currency> activeCurrencies = currencyRepository.findActiveOrdered();
    if (activeCurrencies.isEmpty()) {
      throw ApiException.badRequest(
          "NO_ACTIVE_CURRENCIES", "Немає активних валют для синхронізації курсів НБУ");
    }

    Set<String> activeCodes = activeCurrencyCodes(activeCurrencies);
    ResolvedNbuSnapshot snapshot = businessDayResolver.resolveLastBusinessDayRates(activeCodes);
    Instant fetchedAt = Instant.now();
    LocalDate rateDate = snapshot.rateDate();

    List<NbuRateDto> saved = new ArrayList<>();
    for (Currency currency : activeCurrencies) {
      NbuRateDto dto = upsertRate(currency, snapshot, rateDate, fetchedAt);
      saved.add(dto);
    }
    saved.sort(Comparator.comparing(NbuExchangeRateService::nbuRateDtoCurrencyCode));
    return new SyncNbuRatesResponse(rateDate, fetchedAt, saved.size(), saved);
  }

  @Transactional(readOnly = true)
  public NbuRatesSnapshotDto getRatesForDate(LocalDate calculationDate) {
    Objects.requireNonNull(calculationDate, "calculationDate");
    List<Currency> activeCurrencies = currencyRepository.findActiveOrdered();
    if (activeCurrencies.isEmpty()) {
      throw ApiException.badRequest(
          "NO_ACTIVE_CURRENCIES", "Немає активних валют для отримання курсів НБУ");
    }
    Set<String> activeCodes = activeCurrencyCodes(activeCurrencies);
    LocalDate rateDate =
        nbuRateRepository
            .findLatestCompleteRateDateOnOrBefore(calculationDate, activeCodes.size())
            .orElseThrow(
                () ->
                    ApiException.unprocessableEntity(
                        "NBU_RATES_NOT_AVAILABLE_FOR_DATE",
                        "Курси НБУ недоступні на дату " + calculationDate));
    return buildSnapshot(rateDate, activeCodes);
  }

  @Transactional(readOnly = true)
  public NbuRatesSnapshotDto getLatestRates() {
    LocalDate latestDate =
        nbuRateRepository
            .findLatestRateDate()
            .orElseThrow(
                () ->
                    ApiException.notFound(
                        "Курси НБУ ще не синхронізовані. Натисніть «Оновити курси НБУ»."));

    List<Currency> activeCurrencies = currencyRepository.findActiveOrdered();
    Set<String> activeCodes = activeCurrencyCodes(activeCurrencies);
    return buildSnapshot(latestDate, activeCodes);
  }

  private NbuRatesSnapshotDto buildSnapshot(LocalDate rateDate, Set<String> activeCodes) {
    List<CurrencyNbuRate> stored =
        nbuRateRepository.findByRateDateAndCurrencyCodeIn(rateDate, activeCodes);
    if (stored.size() < activeCodes.size()) {
      throw ApiException.unprocessableEntity(
          "NBU_RATES_NOT_AVAILABLE_FOR_DATE", "Неповний знімок курсів НБУ на дату " + rateDate);
    }
    Instant fetchedAt =
        stored.stream()
            .map(NbuExchangeRateService::nbuRateFetchedAt)
            .max(Comparator.naturalOrder())
            .orElse(Instant.now());
    List<NbuRateDto> rates =
        stored.stream()
            .map(this::toDto)
            .sorted(Comparator.comparing(NbuExchangeRateService::nbuRateDtoCurrencyCode))
            .toList();
    return new NbuRatesSnapshotDto(rateDate, fetchedAt, rates);
  }

  private NbuRateDto upsertRate(
      Currency currency, ResolvedNbuSnapshot snapshot, LocalDate rateDate, Instant fetchedAt) {
    String code = currency.getCode();
    BigDecimal rate;
    String special = null;
    int units = currency.getNbuUnits();

    if (BASE_CURRENCY.equals(code)) {
      rate = BigDecimal.ONE;
    } else {
      NbuRateRow row =
          Objects.requireNonNull(
              snapshot.ratesByCode().get(code), "Курс НБУ відсутній для активної валюти: " + code);
      rate = row.rate();
      special = row.special();
    }

    BigDecimal ratePerUnit = rate.divide(BigDecimal.valueOf(units), 6, RoundingMode.HALF_UP);

    CurrencyNbuRate entity =
        nbuRateRepository
            .findById(new com.geosun.tms.reference.domain.CurrencyNbuRateId(code, rateDate))
            .orElseGet(CurrencyNbuRate::new);
    entity.setCurrencyCode(code);
    entity.setRateDate(rateDate);
    entity.setRate(rate);
    entity.setNbuUnits(units);
    entity.setRatePerUnit(ratePerUnit);
    entity.setSpecial(special);
    entity.setFetchedAt(fetchedAt);
    nbuRateRepository.save(entity);
    return new NbuRateDto(code, rate, ratePerUnit, units, special);
  }

  private static Set<String> activeCurrencyCodes(List<Currency> currencies) {
    return currencies.stream()
        .map(NbuExchangeRateService::currencyCode)
        .collect(Collectors.toSet());
  }

  @NonNull
  private static String currencyCode(@NonNull Currency currency) {
    String code = currency.getCode();
    if (code == null) {
      throw new NullPointerException("currencyCode");
    }
    return code;
  }

  @NonNull
  private static String nbuRateDtoCurrencyCode(@NonNull NbuRateDto dto) {
    String code = dto.currencyCode();
    if (code == null) {
      throw new NullPointerException("currencyCode");
    }
    return code;
  }

  @NonNull
  private static Instant nbuRateFetchedAt(@NonNull CurrencyNbuRate rate) {
    Instant fetchedAt = rate.getFetchedAt();
    if (fetchedAt == null) {
      throw new NullPointerException("fetchedAt");
    }
    return fetchedAt;
  }

  private NbuRateDto toDto(@NonNull CurrencyNbuRate entity) {
    return new NbuRateDto(
        entity.getCurrencyCode(),
        entity.getRate(),
        entity.getRatePerUnit(),
        entity.getNbuUnits(),
        entity.getSpecial());
  }
}
