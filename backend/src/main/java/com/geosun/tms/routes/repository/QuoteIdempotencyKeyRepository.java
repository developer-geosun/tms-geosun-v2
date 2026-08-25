package com.geosun.tms.routes.repository;

import com.geosun.tms.routes.domain.QuoteIdempotencyKey;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuoteIdempotencyKeyRepository extends JpaRepository<QuoteIdempotencyKey, String> {
  Optional<QuoteIdempotencyKey> findByOperationTypeAndIdempotencyKeyAndActorUserId(
      String operationType, String idempotencyKey, String actorUserId);
}
