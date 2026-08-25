package com.geosun.tms.freight.cost.service;

import java.util.Set;

/** Коди країн-членів ЄС для fallback тарифу доріг v1. */
public final class EuCountryCodes {
  private static final Set<String> EU_MEMBER_ALPHA2 =
      Set.of(
          "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT",
          "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE");

  private static final java.math.BigDecimal DEFAULT_EU_TOLL_EUR_PER_KM =
      new java.math.BigDecimal("0.10");

  private EuCountryCodes() {}

  public static boolean isEuMember(String countryCode) {
    return countryCode != null && EU_MEMBER_ALPHA2.contains(countryCode.toUpperCase());
  }

  public static java.math.BigDecimal defaultEuTollEurPerKm() {
    return DEFAULT_EU_TOLL_EUR_PER_KM;
  }
}
