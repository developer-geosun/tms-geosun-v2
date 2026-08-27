package com.geosun.tms.trips.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "trip_number_seq")
public class TripNumberSeq {

  @Id
  @Column(name = "seq_year", nullable = false)
  private int year;

  @Column(name = "last_seq", nullable = false)
  private int lastValue;

  public int getYear() {
    return year;
  }

  public void setYear(int year) {
    this.year = year;
  }

  public int getLastValue() {
    return lastValue;
  }

  public void setLastValue(int lastValue) {
    this.lastValue = lastValue;
  }
}
