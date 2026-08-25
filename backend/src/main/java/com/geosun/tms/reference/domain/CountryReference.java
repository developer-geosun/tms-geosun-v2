package com.geosun.tms.reference.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "country_reference")
public class CountryReference {
  @Id
  @Column(name = "code_alpha2", nullable = false, length = 2)
  private String codeAlpha2;

  @Column(name = "code_alpha3", nullable = false, length = 3)
  private String codeAlpha3;

  @Column(name = "name_uk", nullable = false, length = 128)
  private String nameUk;

  @Column(name = "name_en", nullable = false, length = 128)
  private String nameEn;

  @Column(name = "name_ru", nullable = false, length = 128)
  private String nameRu;

  public String getCodeAlpha2() {
    return codeAlpha2;
  }

  public void setCodeAlpha2(String codeAlpha2) {
    this.codeAlpha2 = codeAlpha2;
  }

  public String getCodeAlpha3() {
    return codeAlpha3;
  }

  public void setCodeAlpha3(String codeAlpha3) {
    this.codeAlpha3 = codeAlpha3;
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

  public String getNameRu() {
    return nameRu;
  }

  public void setNameRu(String nameRu) {
    this.nameRu = nameRu;
  }
}
