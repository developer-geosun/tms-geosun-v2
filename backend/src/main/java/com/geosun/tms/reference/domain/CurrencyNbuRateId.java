package com.geosun.tms.reference.domain;

import java.io.Serializable;
import java.time.LocalDate;
import java.util.Objects;

public class CurrencyNbuRateId implements Serializable {
  private String currencyCode;
  private LocalDate rateDate;

  public CurrencyNbuRateId() {}

  public CurrencyNbuRateId(String currencyCode, LocalDate rateDate) {
    this.currencyCode = currencyCode;
    this.rateDate = rateDate;
  }

  public String getCurrencyCode() {
    return currencyCode;
  }

  public void setCurrencyCode(String currencyCode) {
    this.currencyCode = currencyCode;
  }

  public LocalDate getRateDate() {
    return rateDate;
  }

  public void setRateDate(LocalDate rateDate) {
    this.rateDate = rateDate;
  }

  @Override
  public boolean equals(Object o) {
    if (this == o) {
      return true;
    }
    if (o == null || getClass() != o.getClass()) {
      return false;
    }
    CurrencyNbuRateId that = (CurrencyNbuRateId) o;
    return Objects.equals(currencyCode, that.currencyCode)
        && Objects.equals(rateDate, that.rateDate);
  }

  @Override
  public int hashCode() {
    return Objects.hash(currencyCode, rateDate);
  }
}
