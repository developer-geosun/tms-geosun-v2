package com.geosun.tms.freight.cost.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name = "country_toll_rules")
public class CountryTollRule {
  @Id
  @Column(name = "id", nullable = false, updatable = false, length = 36)
  private String id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "toll_tariff_set_id", nullable = false)
  private TollTariffSet tollTariffSet;

  @Column(name = "country_code", nullable = false, length = 2)
  private String countryCode;

  @Enumerated(EnumType.STRING)
  @Column(name = "toll_type", nullable = false, length = 32)
  private TollType tollType;

  @Column(name = "rate", nullable = false, precision = 12, scale = 4)
  private BigDecimal rate;

  @Column(name = "fixed_days")
  private Integer fixedDays;

  @Column(name = "is_active", nullable = false)
  private boolean active = true;

  @CreationTimestamp
  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @UpdateTimestamp
  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  @PrePersist
  void assignId() {
    if (id == null) {
      id = UUID.randomUUID().toString();
    }
  }

  public String getId() {
    return id;
  }

  public TollTariffSet getTollTariffSet() {
    return tollTariffSet;
  }

  public void setTollTariffSet(TollTariffSet tollTariffSet) {
    this.tollTariffSet = tollTariffSet;
  }

  public String getCountryCode() {
    return countryCode;
  }

  public void setCountryCode(String countryCode) {
    this.countryCode = countryCode;
  }

  public TollType getTollType() {
    return tollType;
  }

  public void setTollType(TollType tollType) {
    this.tollType = tollType;
  }

  public BigDecimal getRate() {
    return rate;
  }

  public void setRate(BigDecimal rate) {
    this.rate = rate;
  }

  public Integer getFixedDays() {
    return fixedDays;
  }

  public void setFixedDays(Integer fixedDays) {
    this.fixedDays = fixedDays;
  }

  public boolean isActive() {
    return active;
  }

  public void setActive(boolean active) {
    this.active = active;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public Instant getUpdatedAt() {
    return updatedAt;
  }
}
