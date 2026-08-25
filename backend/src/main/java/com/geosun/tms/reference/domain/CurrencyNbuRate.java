package com.geosun.tms.reference.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "currency_nbu_rates")
@IdClass(CurrencyNbuRateId.class)
public class CurrencyNbuRate {
  @Id
  @Column(name = "currency_code", nullable = false, length = 3)
  private String currencyCode;

  @Id
  @Column(name = "rate_date", nullable = false)
  private LocalDate rateDate;

  @Column(name = "rate", nullable = false, precision = 18, scale = 6)
  private BigDecimal rate;

  @Column(name = "nbu_units", nullable = false)
  private int nbuUnits;

  @Column(name = "rate_per_unit", nullable = false, precision = 18, scale = 6)
  private BigDecimal ratePerUnit;

  @Column(name = "special", length = 1)
  private String special;

  @Column(name = "fetched_at", nullable = false)
  private Instant fetchedAt;

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

  public BigDecimal getRate() {
    return rate;
  }

  public void setRate(BigDecimal rate) {
    this.rate = rate;
  }

  public int getNbuUnits() {
    return nbuUnits;
  }

  public void setNbuUnits(int nbuUnits) {
    this.nbuUnits = nbuUnits;
  }

  public BigDecimal getRatePerUnit() {
    return ratePerUnit;
  }

  public void setRatePerUnit(BigDecimal ratePerUnit) {
    this.ratePerUnit = ratePerUnit;
  }

  public String getSpecial() {
    return special;
  }

  public void setSpecial(String special) {
    this.special = special;
  }

  public Instant getFetchedAt() {
    return fetchedAt;
  }

  public void setFetchedAt(Instant fetchedAt) {
    this.fetchedAt = fetchedAt;
  }
}
