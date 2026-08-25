package com.geosun.tms.reference.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.geosun.tms.reference.client.NbuApiClient;
import com.geosun.tms.reference.client.NbuRateRow;
import com.geosun.tms.reference.config.NbuExchangeRateProperties;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class NbuBusinessDayResolverTest {
  @Mock private NbuApiClient nbuApiClient;

  private NbuBusinessDayResolver resolver;

  @BeforeEach
  void setUp() {
    NbuExchangeRateProperties properties = new NbuExchangeRateProperties();
    properties.setMaxLookbackDays(14);
    resolver = new NbuBusinessDayResolver(nbuApiClient, properties);
  }

  @Test
  void resolvesRatesFromLastAvailableBusinessDay() {
    LocalDate friday = LocalDate.of(2026, 5, 22);
    when(nbuApiClient.fetchRatesForDate(any()))
        .thenReturn(
            List.of(
                new NbuRateRow("USD", new BigDecimal("44.1"), friday, "N"),
                new NbuRateRow("EUR", new BigDecimal("51.2"), friday, null)));

    var snapshot = resolver.resolveLastBusinessDayRates(Set.of("USD", "EUR", "UAH"));

    assertThat(snapshot.rateDate()).isEqualTo(friday);
    assertThat(snapshot.ratesByCode()).containsKeys("USD", "EUR");
  }
}
