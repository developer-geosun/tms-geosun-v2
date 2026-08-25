package com.geosun.tms.routes.domain;

import com.geosun.tms.auth.domain.user.User;
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
@Table(name = "quote_idempotency_keys")
public class QuoteIdempotencyKey {
  @Id
  @Column(name = "id", nullable = false, updatable = false, length = 36)
  private String id;

  @Column(name = "operation_type", nullable = false, length = 32)
  private String operationType;

  @Column(name = "idempotency_key", nullable = false, length = 128)
  private String idempotencyKey;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "actor_user_id", nullable = false)
  private User actorUser;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "request_id")
  private RouteRequest request;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "quote_id")
  private FreightQuote quote;

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

  public String getOperationType() {
    return operationType;
  }

  public void setOperationType(String operationType) {
    this.operationType = operationType;
  }

  public String getIdempotencyKey() {
    return idempotencyKey;
  }

  public void setIdempotencyKey(String idempotencyKey) {
    this.idempotencyKey = idempotencyKey;
  }

  public User getActorUser() {
    return actorUser;
  }

  public void setActorUser(User actorUser) {
    this.actorUser = actorUser;
  }

  public RouteRequest getRequest() {
    return request;
  }

  public void setRequest(RouteRequest request) {
    this.request = request;
  }

  public FreightQuote getQuote() {
    return quote;
  }

  public void setQuote(FreightQuote quote) {
    this.quote = quote;
  }
}
