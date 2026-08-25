package com.geosun.tms.routes.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
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
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name = "route_points")
public class RoutePoint {
  @Id
  @Column(name = "id", nullable = false, updatable = false, length = 36)
  private String id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "route_id", nullable = false)
  private Route route;

  @Column(name = "point_order", nullable = false)
  private Integer pointOrder;

  @Enumerated(EnumType.STRING)
  @Column(name = "point_type", nullable = false, length = 16)
  private RoutePointKind pointType;

  @Convert(converter = RoutePointOperationsConverter.class)
  @Column(name = "operations", columnDefinition = "text")
  private List<RoutePointOperation> operations = new ArrayList<>();

  @Column(name = "address", nullable = false, length = 500)
  private String address;

  @Column(name = "lat", nullable = false, precision = 10, scale = 7)
  private BigDecimal lat;

  @Column(name = "lng", nullable = false, precision = 10, scale = 7)
  private BigDecimal lng;

  @Column(name = "country", length = 8)
  private String country;

  @Column(name = "is_border", nullable = false)
  private boolean border;

  @Column(name = "segment_distance_km_to_next", precision = 12, scale = 3)
  private BigDecimal segmentDistanceKmToNext;

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

  public void setId(String id) {
    this.id = id;
  }

  public Route getRoute() {
    return route;
  }

  public void setRoute(Route route) {
    this.route = route;
  }

  public Integer getPointOrder() {
    return pointOrder;
  }

  public void setPointOrder(Integer pointOrder) {
    this.pointOrder = pointOrder;
  }

  public RoutePointKind getPointType() {
    return pointType;
  }

  public void setPointType(RoutePointKind pointType) {
    this.pointType = pointType;
  }

  public List<RoutePointOperation> getOperations() {
    return operations;
  }

  public void setOperations(List<RoutePointOperation> operations) {
    this.operations = operations == null ? new ArrayList<>() : operations;
  }

  public String getAddress() {
    return address;
  }

  public void setAddress(String address) {
    this.address = address;
  }

  public BigDecimal getLat() {
    return lat;
  }

  public void setLat(BigDecimal lat) {
    this.lat = lat;
  }

  public BigDecimal getLng() {
    return lng;
  }

  public void setLng(BigDecimal lng) {
    this.lng = lng;
  }

  public String getCountry() {
    return country;
  }

  public void setCountry(String country) {
    this.country = country;
  }

  public boolean isBorder() {
    return border;
  }

  public void setBorder(boolean border) {
    this.border = border;
  }

  public BigDecimal getSegmentDistanceKmToNext() {
    return segmentDistanceKmToNext;
  }

  public void setSegmentDistanceKmToNext(BigDecimal segmentDistanceKmToNext) {
    this.segmentDistanceKmToNext = segmentDistanceKmToNext;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public Instant getUpdatedAt() {
    return updatedAt;
  }
}
