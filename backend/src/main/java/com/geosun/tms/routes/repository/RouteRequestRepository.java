package com.geosun.tms.routes.repository;

import com.geosun.tms.routes.domain.RouteRequest;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.lang.NonNull;

public interface RouteRequestRepository
    extends JpaRepository<RouteRequest, Long>, JpaSpecificationExecutor<RouteRequest> {
  boolean existsByRoute_Id(Long routeId);

  @EntityGraph(attributePaths = {"route", "user"})
  List<RouteRequest> findByUserIdOrderByCreatedAtDesc(String userId);

  @EntityGraph(attributePaths = {"route", "route.points", "user"})
  Optional<RouteRequest> findByIdAndUserId(Long id, String userId);

  @EntityGraph(attributePaths = {"route", "user"})
  List<RouteRequest> findAllByOrderByCreatedAtDesc();

  @EntityGraph(attributePaths = {"route", "route.points", "user"})
  @NonNull
  Optional<RouteRequest> findById(@NonNull Long id);

  /** Унікальні email власників заявок — довідник для фільтра адмінки. */
  @Query("select distinct u.email from RouteRequest r join r.user u where u.email is not null")
  List<String> findDistinctOwnerEmails();
}
