package com.geosun.tms.reference.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "currencies")
public class Currency {
  @Id
  @Column(name = "code", nullable = false, length = 3)
  private String code;

  @Column(name = "numeric_code", nullable = false)
  private int numericCode;

  @Column(name = "name_uk", nullable = false, length = 128)
  private String nameUk;

  @Column(name = "name_en", length = 128)
  private String nameEn;

  @Column(name = "nbu_units", nullable = false)
  private int nbuUnits = 1;

  @Column(name = "minor_units", nullable = false)
  private int minorUnits = 2;

  @Column(name = "is_active", nullable = false)
  private boolean active;

  @Column(name = "display_order")
  private Integer displayOrder;

  public String getCode() {
    return code;
  }

  public void setCode(String code) {
    this.code = code;
  }

  public int getNumericCode() {
    return numericCode;
  }

  public void setNumericCode(int numericCode) {
    this.numericCode = numericCode;
  }

  public String getNameUk() {
    return nameUk;
  }

  public void setNameUk(String nameUk) {
    this.nameUk = nameUk;
  }

  public String getNameEn() {
    return nameEn;
  }

  public void setNameEn(String nameEn) {
    this.nameEn = nameEn;
  }

  public int getNbuUnits() {
    return nbuUnits;
  }

  public void setNbuUnits(int nbuUnits) {
    this.nbuUnits = nbuUnits;
  }

  public int getMinorUnits() {
    return minorUnits;
  }

  public void setMinorUnits(int minorUnits) {
    this.minorUnits = minorUnits;
  }

  public boolean isActive() {
    return active;
  }

  public void setActive(boolean active) {
    this.active = active;
  }

  public Integer getDisplayOrder() {
    return displayOrder;
  }

  public void setDisplayOrder(Integer displayOrder) {
    this.displayOrder = displayOrder;
  }
}
