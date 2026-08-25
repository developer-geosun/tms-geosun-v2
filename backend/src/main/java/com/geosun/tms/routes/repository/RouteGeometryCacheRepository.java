package com.geosun.tms.routes.repository;

import com.geosun.tms.routes.domain.RouteGeometryCacheEntry;
import java.time.Instant;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RouteGeometryCacheRepository
    extends JpaRepository<RouteGeometryCacheEntry, String> {
  Optional<RouteGeometryCacheEntry> findByCacheKeyAndExpiresAtAfter(String cacheKey, Instant now);
}
