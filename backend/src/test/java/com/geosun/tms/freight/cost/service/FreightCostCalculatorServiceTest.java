package com.geosun.tms.freight.cost.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import com.geosun.tms.freight.cost.domain.CountryTollRule;
import com.geosun.tms.freight.cost.domain.FreightNumericScenario;
import com.geosun.tms.freight.cost.domain.MarginType;
import com.geosun.tms.freight.cost.domain.SeasonMode;
import com.geosun.tms.freight.cost.domain.TollTariffSet;
import com.geosun.tms.freight.cost.domain.TollType;
import com.geosun.tms.freight.cost.dto.response.FreightCostCalculationSummaryDto;
import com.geosun.tms.freight.cost.repository.CountryTollRuleRepository;
import com.geosun.tms.reference.dto.response.NbuRateDto;
import com.geosun.tms.reference.dto.response.NbuRatesSnapshotDto;
import com.geosun.tms.routes.domain.Route;
import com.geosun.tms.routes.domain.RoutePoint;
import com.geosun.tms.routes.domain.RoutePointKind;
import com.geosun.tms.routes.dto.response.CountryDistanceDto;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class FreightCostCalculatorServiceTest {
  private static final String TOLL_SET_ID = "a1000000-0000-4000-8000-000000000001";

  @Mock private CountryTollRuleRepository countryTollRuleRepository;

  private FreightCostCalculatorService calculator;

  @BeforeEach
  void setUp() {
    calculator = new FreightCostCalculatorService(countryTollRuleRepository);
  }

  @Test
  void calculate_appliesClosedFormAndTollRules() {
    when(countryTollRuleRepository.findByTollTariffSet_IdAndActiveTrueOrderByCountryCodeAsc(
            eq(TOLL_SET_ID)))
        .thenReturn(List.of(plRule()));

    FreightNumericScenario scenario = sampleScenario();
    RouteLengths lengths = new RouteLengths(bd("1000"), bd("150"), bd("850"), bd("0"), false);
    List<CountryDistanceDto> countries = List.of(new CountryDistanceDto("PL", 200_000L, 0L, 1));
    NbuRatesSnapshotDto rates =
        new NbuRatesSnapshotDto(
            LocalDate.of(2026, 5, 20),
            java.time.Instant.parse("2026-05-20T10:00:00Z"),
            List.of(
                new NbuRateDto("UAH", BigDecimal.ONE, BigDecimal.ONE, 1, null),
                new NbuRateDto("EUR", bd("40"), bd("40"), 1, null),
                new NbuRateDto("USD", bd("38"), bd("38"), 1, null)));

    FreightCostCalculationSummaryDto result =
        calculator.calculate(
            scenario,
            lengths,
            bd("0"),
            countries,
            rates,
            LocalDate.of(2026, 5, 20),
            LocalDate.of(2026, 6, 15),
            null);

    assertThat(result.seasonUsed()).isEqualTo("NON_WINTER");
    assertThat(result.fuelCostUah()).isEqualByComparingTo("30603.25");
    assertThat(result.perDiemDays()).isEqualTo(4);
    assertThat(result.perDiemEur()).isEqualByComparingTo("40.00");
    assertThat(result.tollsUah()).isEqualByComparingTo("960.00");
    assertThat(result.directCostUah()).isEqualByComparingTo("33163.25");

    assertThat(result.costBeforeMarginUah().add(result.marginUah()))
        .isEqualByComparingTo(result.totalUah());
    assertThat(result.totalUah()).isGreaterThan(result.directCostUah());
    assertThat(result.totalUah().subtract(result.totalProposalAmount().multiply(bd("40"))).abs())
        .isLessThanOrEqualTo(bd("0.10"));
    assertThat(result.tollLines()).hasSize(1);
    assertThat(result.tollLines().getFirst().countryCode()).isEqualTo("PL");
  }

  @Test
  void calculate_marginAndCostBeforeMarginSumToTotal() {
    when(countryTollRuleRepository.findByTollTariffSet_IdAndActiveTrueOrderByCountryCodeAsc(
            eq(TOLL_SET_ID)))
        .thenReturn(List.of(plRule()));

    FreightNumericScenario scenario = sampleScenario();
    scenario.setDriverSalaryPercentOfFreight(bd("17"));
    scenario.setMarginPercent(bd("80"));

    FreightCostCalculationSummaryDto result =
        calculator.calculate(
            scenario,
            new RouteLengths(bd("1268.835"), bd("0"), bd("1268.834"), bd("0"), false),
            bd("0"),
            List.of(
                new CountryDistanceDto("UA", 501_045L, 0L, 1),
                new CountryDistanceDto("PL", 767_789L, 0L, 2)),
            new NbuRatesSnapshotDto(
                LocalDate.of(2026, 7, 8),
                java.time.Instant.parse("2026-07-08T10:00:00Z"),
                List.of(
                    new NbuRateDto("UAH", BigDecimal.ONE, BigDecimal.ONE, 1, null),
                    new NbuRateDto("EUR", bd("50.88"), bd("50.88"), 1, null),
                    new NbuRateDto("USD", bd("44.51"), bd("44.51"), 1, null))),
            LocalDate.of(2026, 7, 8),
            LocalDate.of(2026, 7, 8),
            SeasonMode.NON_WINTER);

    assertThat(result.costBeforeMarginUah())
        .isEqualByComparingTo(result.directCostUah().add(result.driverCostUah()));
    assertThat(result.marginPercent()).isEqualByComparingTo(bd("80"));
    assertThat(result.driverSalaryPercent()).isEqualByComparingTo(bd("17"));
    assertThat(result.costBeforeMarginUah().add(result.marginUah()))
        .isEqualByComparingTo(result.totalUah());
    assertThat(result.totalUah()).isGreaterThan(result.directCostUah());
  }

  @Test
  void calculate_fixedPerTripMarginUsesClosedForm() {
    when(countryTollRuleRepository.findByTollTariffSet_IdAndActiveTrueOrderByCountryCodeAsc(
            eq(TOLL_SET_ID)))
        .thenReturn(List.of(plRule()));

    FreightNumericScenario scenario = sampleScenario();
    scenario.setMarginType(MarginType.FIXED_PER_TRIP);
    scenario.setMarginPercent(null);
    // M = 250 EUR × 40 UAH/EUR = 10_000 UAH (proposalCurrency = EUR)
    scenario.setMarginFixedAmount(bd("250.00"));
    scenario.setDriverSalaryPercentOfFreight(bd("15"));

    FreightCostCalculationSummaryDto result =
        calculator.calculate(
            scenario,
            new RouteLengths(bd("1000"), bd("150"), bd("850"), bd("0"), false),
            bd("0"),
            List.of(new CountryDistanceDto("PL", 200_000L, 0L, 1)),
            new NbuRatesSnapshotDto(
                LocalDate.of(2026, 5, 20),
                java.time.Instant.parse("2026-05-20T10:00:00Z"),
                List.of(
                    new NbuRateDto("UAH", BigDecimal.ONE, BigDecimal.ONE, 1, null),
                    new NbuRateDto("EUR", bd("40"), bd("40"), 1, null),
                    new NbuRateDto("USD", bd("38"), bd("38"), 1, null))),
            LocalDate.of(2026, 5, 20),
            LocalDate.of(2026, 6, 15),
            SeasonMode.NON_WINTER);

    // DirectCost з еталонного тесту sampleScenario + PL 200 км
    assertThat(result.directCostUah()).isEqualByComparingTo("33163.25");
    // T = (C + M_uah) / (1 − p) = (33163.25 + 10000) / 0.85
    assertThat(result.totalUah()).isEqualByComparingTo("50780.29");
    assertThat(result.marginUah()).isEqualByComparingTo("10000.00");
    assertThat(result.marginPercent()).isNull();
    assertThat(result.costBeforeMarginUah().add(result.marginUah()))
        .isEqualByComparingTo(result.totalUah());
    assertThat(result.costBeforeMarginUah())
        .isEqualByComparingTo(result.directCostUah().add(result.driverCostUah()));
  }

  @Test
  void summaryBuilder_containsKeyFiguresFromBreakdown() {
    FreightCostCalculationSummaryDto data =
        new FreightCostCalculationSummaryDto(
            LocalDate.of(2026, 5, 20),
            "Test",
            "EUR",
            "NON_WINTER",
            bd("45.500"),
            bd("1000"),
            bd("150"),
            bd("850"),
            false,
            LocalDate.of(2026, 5, 20),
            bd("40"),
            bd("38"),
            bd("40"),
            bd("52.5"),
            bd("323"),
            bd("30503.25"),
            4,
            bd("40"),
            bd("1600"),
            List.of(),
            bd("960"),
            bd("33063.25"),
            bd("15"),
            bd("5000"),
            bd("15000"),
            bd("30"),
            bd("20000"),
            bd("25000"),
            bd("25000"));

    Route route = new Route();
    RoutePoint p1 = new RoutePoint();
    p1.setPointOrder(1);
    p1.setPointType(RoutePointKind.START);
    p1.setAddress("Kyiv");
    p1.setSegmentDistanceKmToNext(bd("120.500"));
    RoutePoint p2 = new RoutePoint();
    p2.setPointOrder(2);
    p2.setPointType(RoutePointKind.FINISH);
    p2.setAddress("Warsaw");
    route.setPoints(List.of(p1, p2));

    String text =
        new FreightCostCalculationSummaryBuilder()
            .build(data, route, new FreightRouteLengthService.StartPoint(50.4, 30.5, "Depot Kyiv"));
    assertThat(text).contains("30503.25");
    assertThat(text).contains("33063.25");
    assertThat(text).contains("25000.00");
    assertThat(text).contains("EUR");
    assertThat(text).contains("--- Точки маршруту ---");
    assertThat(text).contains("0. Точка 0: Depot Kyiv → 45.500 км");
    assertThat(text).contains("1. START: Kyiv → 120.500 км");
    assertThat(text).contains("2. FINISH: Warsaw");
  }

  private static CountryTollRule plRule() {
    CountryTollRule rule = new CountryTollRule();
    rule.setCountryCode("PL");
    rule.setTollType(TollType.EUR_PER_KM);
    rule.setRate(bd("0.12"));
    rule.setActive(true);
    return rule;
  }

  private static FreightNumericScenario sampleScenario() {
    TollTariffSet tollSet = new TollTariffSet();
    ReflectionTestUtils.setField(tollSet, "id", TOLL_SET_ID);
    tollSet.setName("EU default");

    FreightNumericScenario scenario = new FreightNumericScenario();
    scenario.setName("UA8150 margin30 v1");
    scenario.setFuelConsumptionEmptyLPer100km(bd("35"));
    scenario.setFuelConsumptionLoadedNonWinterLPer100km(bd("38"));
    scenario.setFuelConsumptionLoadedWinterLPer100km(bd("40"));
    scenario.setSeasonMode(SeasonMode.AUTO);
    scenario.setFuelPricePerLiter(bd("81.50"));
    scenario.setDriverSalaryPercentOfFreight(bd("15"));
    scenario.setPerDiemAmountPerDay(bd("10"));
    scenario.setPerDiemRouteDivisorKm(600);
    scenario.setPerDiemFixedExtraDays(2);
    scenario.setMarginType(MarginType.PERCENT_OF_COST_BEFORE_MARGIN);
    scenario.setMarginPercent(bd("30"));
    scenario.setProposalCurrency("EUR");
    scenario.setTollTariffSet(tollSet);
    return scenario;
  }

  private static BigDecimal bd(String value) {
    return new BigDecimal(value);
  }
}
