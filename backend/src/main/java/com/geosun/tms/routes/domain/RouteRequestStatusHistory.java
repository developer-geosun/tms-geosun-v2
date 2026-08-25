package com.geosun.tms.routes.domain;

import com.geosun.tms.auth.domain.user.User;
import com.geosun.tms.routes.dto.RouteRequestStatus;
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

@Entity
@Table(name = "request_status_history")
public class RouteRequestStatusHistory {
  @Id
  @Column(name = "id", nullable = false, updatable = false, length = 36)
  private String id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "request_id", nullable = false)
  private RouteRequest request;

  @Enumerated(EnumType.STRING)
  @Column(name = "from_status", length = 32)
  private RouteRequestStatus fromStatus;

  @Enumerated(EnumType.STRING)
  @Column(name = "to_status", nullable = false, length = 32)
  private RouteRequestStatus toStatus;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "changed_by")
  private User changedBy;

  @Column(name = "changed_at", nullable = false)
  private Instant changedAt;

  @Column(name = "note", length = 500)
  private String note;

  @PrePersist
  void assignIdAndTimestamp() {
    if (id == null) {
      id = UUID.randomUUID().toString();
    }
    if (changedAt == null) {
      changedAt = Instant.now();
    }
  }

  public String getId() {
    return id;
  }

  public void setId(String id) {
    this.id = id;
  }

  public RouteRequest getRequest() {
    return request;
  }

  public void setRequest(RouteRequest request) {
    this.request = request;
  }

  public RouteRequestStatus getFromStatus() {
    return fromStatus;
  }

  public void setFromStatus(RouteRequestStatus fromStatus) {
    this.fromStatus = fromStatus;
  }

  public RouteRequestStatus getToStatus() {
    return toStatus;
  }

  public void setToStatus(RouteRequestStatus toStatus) {
    this.toStatus = toStatus;
  }

  public User getChangedBy() {
    return changedBy;
  }

  public void setChangedBy(User changedBy) {
    this.changedBy = changedBy;
  }

  public Instant getChangedAt() {
    return changedAt;
  }

  public void setChangedAt(Instant changedAt) {
    this.changedAt = changedAt;
  }

  public String getNote() {
    return note;
  }

  public void setNote(String note) {
    this.note = note;
  }
}
