package com.geosun.tms.reference.service;

import com.geosun.tms.auth.exception.ApiException;
import com.geosun.tms.reference.client.NbuApiClient;
import com.geosun.tms.reference.client.NbuRateRow;
import com.geosun.tms.reference.config.NbuExchangeRateProperties;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

@Component
public class NbuBusinessDayResolver {
  private static final ZoneId KYIV = ZoneId.of("Europe/Kyiv");
  private static final String BASE_CURRENCY = "UAH";

  private final NbuApiClient nbuApiClient;
  private final NbuExchangeRateProperties properties;

  public NbuBusinessDayResolver(NbuApiClient nbuApiClient, NbuExchangeRateProperties properties) {
    this.nbuApiClient = nbuApiClient;
    this.properties = properties;
  }

  public ResolvedNbuSnapshot resolveLastBusinessDayRates(Set<String> requiredCurrencyCodes) {
    Set<String> required =
        requiredCurrencyCodes.stream()
            .filter(code -> !BASE_CURRENCY.equals(code))
            .collect(Collectors.toSet());
    if (required.isEmpty()) {
      throw ApiException.badRequest(
          "NO_ACTIVE_CURRENCIES", "Немає активних валют для синхронізації курсів НБУ (окрім UAH)");
    }

    LocalDate candidate = LocalDate.now(KYIV);
    int attempts = 0;
    while (attempts < properties.getMaxLookbackDays()) {
      candidate = previousWeekday(candidate);
      List<NbuRateRow> rows = nbuApiClient.fetchRatesForDate(candidate);
      if (isValidSnapshot(rows, required)) {
        LocalDate rateDate = rows.getFirst().exchangeDate();
        Map<String, NbuRateRow> byCode = new HashMap<>();
        for (NbuRateRow row : rows) {
          byCode.put(row.currencyCode(), row);
        }
        return new ResolvedNbuSnapshot(rateDate, byCode);
      }
      candidate = candidate.minusDays(1);
      attempts++;
    }
    throw ApiException.serviceUnavailable(
        "NBU_RATES_UNAVAILABLE", "Не вдалося отримати курси НБУ за останній робочий день");
  }

  private static LocalDate previousWeekday(LocalDate date) {
    LocalDate result = date;
    while (result.getDayOfWeek() == DayOfWeek.SATURDAY
        || result.getDayOfWeek() == DayOfWeek.SUNDAY) {
      result = result.minusDays(1);
    }
    return result;
  }

  private static boolean isValidSnapshot(List<NbuRateRow> rows, Set<String> required) {
    if (rows.isEmpty()) {
      return false;
    }
    LocalDate exchangeDate = rows.getFirst().exchangeDate();
    Map<String, NbuRateRow> byCode = new HashMap<>();
    for (NbuRateRow row : rows) {
      if (!row.exchangeDate().equals(exchangeDate)) {
        return false;
      }
      byCode.put(row.currencyCode(), row);
    }
    return byCode.keySet().containsAll(required);
  }

  public record ResolvedNbuSnapshot(LocalDate rateDate, Map<String, NbuRateRow> ratesByCode) {}
}
