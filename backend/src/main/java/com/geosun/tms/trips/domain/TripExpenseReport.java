package com.geosun.tms.trips.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name = "trip_expense_reports")
public class TripExpenseReport {

  @Id
  @Column(name = "id", nullable = false, updatable = false, length = 36)
  private String id;

  @Column(name = "trip_id", nullable = false, length = 36, unique = true)
  private String tripId;

  @Enumerated(EnumType.STRING)
  @Column(name = "status", nullable = false, length = 32)
  private TripExpenseReportStatus status = TripExpenseReportStatus.DRAFT;

  @Column(name = "submitted_at")
  private Instant submittedAt;

  @Column(name = "submitted_by_user_id", length = 36)
  private String submittedByUserId;

  @Column(name = "reviewed_at")
  private Instant reviewedAt;

  @Column(name = "reviewed_by_user_id", length = 36)
  private String reviewedByUserId;

  @Column(name = "review_comment", length = 2000)
  private String reviewComment;

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

  public String getTripId() {
    return tripId;
  }

  public void setTripId(String tripId) {
    this.tripId = tripId;
  }

  public TripExpenseReportStatus getStatus() {
    return status;
  }

  public void setStatus(TripExpenseReportStatus status) {
    this.status = status;
  }

  public Instant getSubmittedAt() {
    return submittedAt;
  }

  public void setSubmittedAt(Instant submittedAt) {
    this.submittedAt = submittedAt;
  }

  public String getSubmittedByUserId() {
    return submittedByUserId;
  }

  public void setSubmittedByUserId(String submittedByUserId) {
    this.submittedByUserId = submittedByUserId;
  }

  public Instant getReviewedAt() {
    return reviewedAt;
  }

  public void setReviewedAt(Instant reviewedAt) {
    this.reviewedAt = reviewedAt;
  }

  public String getReviewedByUserId() {
    return reviewedByUserId;
  }

  public void setReviewedByUserId(String reviewedByUserId) {
    this.reviewedByUserId = reviewedByUserId;
  }

  public String getReviewComment() {
    return reviewComment;
  }

  public void setReviewComment(String reviewComment) {
    this.reviewComment = reviewComment;
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
