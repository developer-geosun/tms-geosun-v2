package com.geosun.tms.trips.repository;

import com.geosun.tms.trips.domain.Trip;
import com.geosun.tms.trips.domain.TripStatus;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TripRepository extends JpaRepository<Trip, String> {

  Page<Trip> findByDeletedFalse(Pageable pageable);

  Page<Trip> findByDeletedTrue(Pageable pageable);

  Optional<Trip> findByIdAndDeletedFalse(String id);

  boolean existsByRouteRequestIdAndDeletedFalse(Long routeRequestId);

  boolean existsByRouteRequestIdAndDeletedFalseAndIdNot(Long routeRequestId, String id);

  @Query(
      """
      select (count(t) > 0) from Trip t
      where t.deleted = false
        and t.status in :statuses
        and t.driverId = :driverId
      """)
  boolean existsActiveByDriver(
      @Param("driverId") String driverId, @Param("statuses") Collection<TripStatus> statuses);

  @Query(
      """
      select (count(t) > 0) from Trip t
      where t.deleted = false
        and t.status in :statuses
        and t.combinationId = :combinationId
      """)
  boolean existsActiveByCombination(
      @Param("combinationId") String combinationId,
      @Param("statuses") Collection<TripStatus> statuses);

  @Query(
      """
      select (count(t) > 0) from Trip t
      where t.deleted = false
        and t.status in :statuses
        and (t.tractorId = :vehicleId or t.trailerId = :vehicleId)
      """)
  boolean existsActiveByVehicle(
      @Param("vehicleId") String vehicleId, @Param("statuses") Collection<TripStatus> statuses);

  @Query(
      """
      select t from Trip t
      where t.deleted = false
        and t.status in :statuses
        and t.id <> :excludeId
        and t.plannedStartAt is not null and t.plannedEndAt is not null
        and t.plannedStartAt < :endAt and t.plannedEndAt > :startAt
        and (
          (:driverId is not null and t.driverId = :driverId)
          or (:tractorId is not null and t.tractorId = :tractorId)
          or (:trailerId is not null and t.trailerId = :trailerId)
        )
      """)
  List<Trip> findOverlapping(
      @Param("excludeId") String excludeId,
      @Param("statuses") Collection<TripStatus> statuses,
      @Param("startAt") Instant startAt,
      @Param("endAt") Instant endAt,
      @Param("driverId") String driverId,
      @Param("tractorId") String tractorId,
      @Param("trailerId") String trailerId);

  Page<Trip> findByDriverIdAndDeletedFalse(String driverId, Pageable pageable);

  @Query(
      """
      select t from Trip t
      where t.deleted = false
        and (:status is null or t.status = :status)
        and (:driverId is null or t.driverId = :driverId)
        and (:from is null or t.plannedStartAt >= :from)
        and (:to is null or t.plannedStartAt <= :to)
      """)
  Page<Trip> findActiveFiltered(
      @Param("status") TripStatus status,
      @Param("driverId") String driverId,
      @Param("from") Instant from,
      @Param("to") Instant to,
      Pageable pageable);
}
