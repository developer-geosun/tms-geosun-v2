package com.geosun.tms.reference.domain;

import com.geosun.tms.storage.domain.StoredFile;
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
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name = "vehicle_registration_scans")
public class VehicleRegistrationScan {

  @Id
  @Column(name = "id", nullable = false, updatable = false, length = 36)
  private String id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "vehicle_id", nullable = false)
  private Vehicle vehicle;

  @Enumerated(EnumType.STRING)
  @Column(name = "side", nullable = false, length = 16)
  private RegistrationScanSide side;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "stored_file_id", nullable = false)
  private StoredFile storedFile;

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

  public Vehicle getVehicle() {
    return vehicle;
  }

  public void setVehicle(Vehicle vehicle) {
    this.vehicle = vehicle;
  }

  public RegistrationScanSide getSide() {
    return side;
  }

  public void setSide(RegistrationScanSide side) {
    this.side = side;
  }

  public StoredFile getStoredFile() {
    return storedFile;
  }

  public void setStoredFile(StoredFile storedFile) {
    this.storedFile = storedFile;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(Instant createdAt) {
    this.createdAt = createdAt;
  }

  public Instant getUpdatedAt() {
    return updatedAt;
  }

  public void setUpdatedAt(Instant updatedAt) {
    this.updatedAt = updatedAt;
  }
}
