package com.geosun.tms.freight.cost.service;

import com.geosun.tms.auth.exception.ApiException;
import com.geosun.tms.freight.cost.domain.CountryTollRule;
import com.geosun.tms.freight.cost.domain.FreightNumericScenario;
import com.geosun.tms.freight.cost.domain.MarginType;
import com.geosun.tms.freight.cost.domain.SeasonMode;
import com.geosun.tms.freight.cost.domain.TollType;
import com.geosun.tms.freight.cost.dto.response.FreightCostCalculationSummaryDto;
import com.geosun.tms.freight.cost.dto.response.TollCountryLineDto;
import com.geosun.tms.freight.cost.repository.CountryTollRuleRepository;
import com.geosun.tms.reference.dto.response.NbuRateDto;
import com.geosun.tms.reference.dto.response.NbuRatesSnapshotDto;
import com.geosun.tms.routes.dto.response.CountryDistanceDto;
import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.springframework.stereotype.Service;

@Service
public class FreightCostCalculatorService {
  private static final MathContext MC = MathContext.DECIMAL64;
  private static final int MONEY_SCALE = 2;
  private static final int LITER_SCALE = 3;
  private static final BigDecimal HUNDRED = new BigDecimal("100");

  private final CountryTollRuleRepository countryTollRuleRepository;

  public FreightCostCalculatorService(CountryTollRuleRepository countryTollRuleRepository) {
    this.countryTollRuleRepository = countryTollRuleRepository;
  }

  public FreightCostCalculationSummaryDto calculate(
      FreightNumericScenario scenario,
      RouteLengths lengths,
      BigDecimal preRouteEmptyKm,
      List<CountryDistanceDto> countryDistances,
      NbuRatesSnapshotDto nbuRates,
      LocalDate calculationDate,
      LocalDate preferredStartDate,
      SeasonMode seasonOverride) {
    boolean winter = resolveWinter(scenario.getSeasonMode(), seasonOverride, preferredStartDate);
    BigDecimal loadedConsumption =
        winter
            ? scenario.getFuelConsumptionLoadedWinterLPer100km()
            : scenario.getFuelConsumptionLoadedNonWinterLPer100km();

    BigDecimal fuelLitersEmpty =
        lengths
            .emptyKm()
            .multiply(scenario.getFuelConsumptionEmptyLPer100km())
            .divide(HUNDRED, LITER_SCALE, RoundingMode.HALF_UP);
    BigDecimal fuelLitersLoaded =
        lengths
            .loadedKm()
            .multiply(loadedConsumption)
            .divide(HUNDRED, LITER_SCALE, RoundingMode.HALF_UP);
    BigDecimal fuelCostUah =
        fuelLitersEmpty
            .add(fuelLitersLoaded)
            .multiply(scenario.getFuelPricePerLiter())
            .setScale(MONEY_SCALE, RoundingMode.HALF_UP);

    int perDiemDays = computePerDiemDays(lengths.totalKm(), scenario);
    BigDecimal perDiemEur =
        scenario
            .getPerDiemAmountPerDay()
            .multiply(BigDecimal.valueOf(perDiemDays))
            .setScale(MONEY_SCALE, RoundingMode.HALF_UP);

    Map<String, NbuRateDto> ratesByCode = indexRates(nbuRates);
    BigDecimal eurRate = requireRate(ratesByCode, "EUR");
    BigDecimal usdRate = requireRate(ratesByCode, "USD");
    String proposalCurrency = scenario.getProposalCurrency().toUpperCase();
    BigDecimal proposalRate = requireRate(ratesByCode, proposalCurrency);

    BigDecimal perDiemUah = convertEurToUah(perDiemEur, eurRate);

    Map<String, CountryTollRule> rulesByCountry = loadRules(scenario.getTollTariffSet().getId());
    List<TollCountryLineDto> tollLines = new ArrayList<>();
    BigDecimal tollsUah = BigDecimal.ZERO.setScale(MONEY_SCALE, RoundingMode.HALF_UP);
    for (CountryDistanceDto distance : countryDistances) {
      if (distance.distanceMeters() <= 0) {
        continue;
      }
      String countryCode = distance.countryCode().toUpperCase();
      BigDecimal km =
          BigDecimal.valueOf(distance.distanceMeters())
              .divide(new BigDecimal("1000"), 3, RoundingMode.HALF_UP);
      TollCountryLineDto line = computeTollLine(countryCode, km, rulesByCountry, eurRate);
      tollLines.add(line);
      tollsUah = tollsUah.add(line.amountUah());
    }

    BigDecimal directCostUah = money(fuelCostUah.add(perDiemUah).add(tollsUah));

    BigDecimal driverPercent =
        scenario.getDriverSalaryPercentOfFreight().divide(HUNDRED, 6, RoundingMode.HALF_UP);

    BigDecimal marginPercentOut;
    BigDecimal totalUah;
    BigDecimal driverCostUah;
    BigDecimal costBeforeMarginUah;
    BigDecimal marginUah;

    if (scenario.getMarginType() == MarginType.FIXED_PER_TRIP) {
      // M задається в proposalCurrency; T = (C + M_uah) / (1 − p), p — % ЗП від T
      BigDecimal marginFixedProposal =
          Objects.requireNonNull(scenario.getMarginFixedAmount(), "marginFixedAmount");
      marginUah = convertCurrencyToUah(marginFixedProposal, proposalRate);
      if (driverPercent.compareTo(BigDecimal.ONE) >= 0) {
        throw ApiException.unprocessableEntity(
            "CALCULATION_NOT_POSSIBLE",
            "Invalid driver salary percent for FIXED_PER_TRIP closed-form formula");
      }
      BigDecimal denominator = BigDecimal.ONE.subtract(driverPercent, MC);
      totalUah =
          money(
              directCostUah
                  .add(marginUah)
                  .divide(denominator, MC)
                  .setScale(MONEY_SCALE, RoundingMode.HALF_UP));
      // S = T − M, щоб T = S + M з точністю до копійки; ЗП = S − C
      costBeforeMarginUah = money(totalUah.subtract(marginUah));
      driverCostUah = money(costBeforeMarginUah.subtract(directCostUah));
      marginPercentOut = null;
    } else {
      // T = C × (1 + m) / (1 − p × (1 + m)), де p — % ЗП від T, m — % маржі від S
      BigDecimal marginPercent =
          Objects.requireNonNull(scenario.getMarginPercent(), "marginPercent")
              .divide(HUNDRED, 6, RoundingMode.HALF_UP);
      BigDecimal onePlusMargin = BigDecimal.ONE.add(marginPercent, MC);
      BigDecimal denominator =
          BigDecimal.ONE.subtract(driverPercent.multiply(onePlusMargin, MC), MC);
      if (denominator.signum() <= 0) {
        throw ApiException.unprocessableEntity(
            "CALCULATION_NOT_POSSIBLE",
            "Invalid driver salary and margin percents for closed-form formula");
      }
      totalUah =
          money(
              directCostUah
                  .multiply(onePlusMargin, MC)
                  .divide(denominator, MC)
                  .setScale(MONEY_SCALE, RoundingMode.HALF_UP));
      driverCostUah = money(totalUah.multiply(driverPercent, MC));
      costBeforeMarginUah = money(directCostUah.add(driverCostUah));
      marginUah = money(totalUah.subtract(costBeforeMarginUah));
      marginPercentOut = scenario.getMarginPercent();
    }

    BigDecimal totalProposalAmount = convertUahToCurrency(totalUah, proposalRate);

    return new FreightCostCalculationSummaryDto(
        calculationDate,
        scenario.getName(),
        proposalCurrency,
        winter ? "WINTER" : "NON_WINTER",
        preRouteEmptyKm,
        lengths.totalKm(),
        lengths.emptyKm(),
        lengths.loadedKm(),
        lengths.fallbackUsed(),
        nbuRates.rateDate(),
        eurRate,
        usdRate,
        proposalRate,
        fuelLitersEmpty,
        fuelLitersLoaded,
        fuelCostUah,
        perDiemDays,
        perDiemEur,
        perDiemUah,
        tollLines,
        tollsUah,
        directCostUah,
        scenario.getDriverSalaryPercentOfFreight(),
        driverCostUah,
        costBeforeMarginUah,
        marginPercentOut,
        marginUah,
        totalUah,
        totalProposalAmount);
  }

  private TollCountryLineDto computeTollLine(
      String countryCode,
      BigDecimal km,
      Map<String, CountryTollRule> rulesByCountry,
      BigDecimal eurRate) {
    CountryTollRule rule = rulesByCountry.get(countryCode);
    if (rule != null) {
      return applyRule(countryCode, km, rule, eurRate, false);
    }
    if (EuCountryCodes.isEuMember(countryCode)) {
      BigDecimal amountEur =
          km.multiply(EuCountryCodes.defaultEuTollEurPerKm())
              .setScale(MONEY_SCALE, RoundingMode.HALF_UP);
      return new TollCountryLineDto(
          countryCode,
          km,
          TollType.EUR_PER_KM,
          EuCountryCodes.defaultEuTollEurPerKm(),
          null,
          amountEur,
          convertEurToUah(amountEur, eurRate),
          true);
    }
    return new TollCountryLineDto(
        countryCode, km, null, BigDecimal.ZERO, null, BigDecimal.ZERO, BigDecimal.ZERO, false);
  }

  private TollCountryLineDto applyRule(
      String countryCode,
      BigDecimal km,
      CountryTollRule rule,
      BigDecimal eurRate,
      boolean defaultFallback) {
    BigDecimal amountEur;
    if (rule.getTollType() == TollType.EUR_PER_DAY) {
      int days = rule.getFixedDays() == null ? 2 : rule.getFixedDays();
      amountEur =
          rule.getRate()
              .multiply(BigDecimal.valueOf(days))
              .setScale(MONEY_SCALE, RoundingMode.HALF_UP);
      return new TollCountryLineDto(
          countryCode,
          km,
          rule.getTollType(),
          rule.getRate(),
          days,
          amountEur,
          convertEurToUah(amountEur, eurRate),
          defaultFallback);
    }
    amountEur = km.multiply(rule.getRate()).setScale(MONEY_SCALE, RoundingMode.HALF_UP);
    return new TollCountryLineDto(
        countryCode,
        km,
        rule.getTollType(),
        rule.getRate(),
        null,
        amountEur,
        convertEurToUah(amountEur, eurRate),
        defaultFallback);
  }

  private Map<String, CountryTollRule> loadRules(String tollSetId) {
    Map<String, CountryTollRule> map = new HashMap<>();
    for (CountryTollRule rule :
        countryTollRuleRepository.findByTollTariffSet_IdAndActiveTrueOrderByCountryCodeAsc(
            tollSetId)) {
      map.put(rule.getCountryCode().toUpperCase(), rule);
    }
    return map;
  }

  private static int computePerDiemDays(BigDecimal totalKm, FreightNumericScenario scenario) {
    int divisor = Math.max(1, scenario.getPerDiemRouteDivisorKm());
    int routeDays = totalKm.divide(BigDecimal.valueOf(divisor), 0, RoundingMode.CEILING).intValue();
    return routeDays + scenario.getPerDiemFixedExtraDays();
  }

  private static boolean resolveWinter(
      SeasonMode seasonMode, SeasonMode seasonOverride, LocalDate preferredStartDate) {
    if (seasonOverride == SeasonMode.WINTER) {
      return true;
    }
    if (seasonOverride == SeasonMode.NON_WINTER) {
      return false;
    }
    if (seasonMode == SeasonMode.WINTER) {
      return true;
    }
    if (seasonMode == SeasonMode.NON_WINTER) {
      return false;
    }
    if (preferredStartDate == null) {
      return false;
    }
    int month = preferredStartDate.getMonthValue();
    return month == 12 || month == 1 || month == 2;
  }

  private static Map<String, NbuRateDto> indexRates(NbuRatesSnapshotDto snapshot) {
    Map<String, NbuRateDto> map = new HashMap<>();
    for (NbuRateDto rate : snapshot.rates()) {
      map.put(rate.currencyCode().toUpperCase(), rate);
    }
    return map;
  }

  private static BigDecimal requireRate(Map<String, NbuRateDto> rates, String code) {
    NbuRateDto rate = rates.get(code.toUpperCase());
    if (rate == null || rate.ratePerUnit() == null) {
      throw ApiException.unprocessableEntity(
          "NBU_RATES_NOT_AVAILABLE_FOR_DATE", "Missing NBU rate for currency: " + code);
    }
    return rate.ratePerUnit();
  }

  private static BigDecimal convertEurToUah(BigDecimal amountEur, BigDecimal eurRatePerUnit) {
    return money(amountEur.multiply(eurRatePerUnit));
  }

  /** Конвертація суми в валюті (ratePerUnit = UAH за 1 одиницю) → UAH. */
  private static BigDecimal convertCurrencyToUah(BigDecimal amount, BigDecimal ratePerUnit) {
    if (ratePerUnit.signum() == 0) {
      throw ApiException.unprocessableEntity(
          "NBU_RATES_NOT_AVAILABLE_FOR_DATE", "Invalid currency rate for margin conversion");
    }
    return money(amount.multiply(ratePerUnit));
  }

  private static BigDecimal convertUahToCurrency(
      BigDecimal amountUah, BigDecimal targetRatePerUnit) {
    if (targetRatePerUnit.signum() == 0) {
      throw ApiException.unprocessableEntity(
          "NBU_RATES_NOT_AVAILABLE_FOR_DATE", "Invalid proposal currency rate");
    }
    return money(amountUah.divide(targetRatePerUnit, MC));
  }

  private static BigDecimal money(BigDecimal value) {
    return value.setScale(MONEY_SCALE, RoundingMode.HALF_UP);
  }
}
