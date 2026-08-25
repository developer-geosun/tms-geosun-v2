package com.geosun.tms.reference.client;

import java.math.BigDecimal;
import java.time.LocalDate;

public record NbuRateRow(
    String currencyCode, BigDecimal rate, LocalDate exchangeDate, String special) {}
