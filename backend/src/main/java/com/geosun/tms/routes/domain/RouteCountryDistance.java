package com.geosun.tms.routes.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name = "route_country_distances")
public class RouteCountryDistance {
  @Id
  @Column(name = "id", nullable = false, updatable = false, length = 36)
  private String id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "route_id", nullable = false)
  private Route route;

  @Column(name = "country_code", nullable = false, length = 8)
  private String countryCode;

  @Column(name = "along_route_order", nullable = false)
  private int alongRouteOrder;

  @Column(name = "distance_m", nullable = false)
  private long distanceMeters;

  @Column(name = "duration_s")
  private Long durationSeconds;

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

  public Route getRoute() {
    return route;
  }

  public void setRoute(Route route) {
    this.route = route;
  }

  public String getCountryCode() {
    return countryCode;
  }

  public void setCountryCode(String countryCode) {
    this.countryCode = countryCode;
  }

  public int getAlongRouteOrder() {
    return alongRouteOrder;
  }

  public void setAlongRouteOrder(int alongRouteOrder) {
    this.alongRouteOrder = alongRouteOrder;
  }

  public long getDistanceMeters() {
    return distanceMeters;
  }

  public void setDistanceMeters(long distanceMeters) {
    this.distanceMeters = distanceMeters;
  }

  public Long getDurationSeconds() {
    return durationSeconds;
  }

  public void setDurationSeconds(Long durationSeconds) {
    this.durationSeconds = durationSeconds;
  }
}
