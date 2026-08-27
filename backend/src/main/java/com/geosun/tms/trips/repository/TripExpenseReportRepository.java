package com.geosun.tms.trips.repository;

import com.geosun.tms.trips.domain.TripExpenseReport;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TripExpenseReportRepository extends JpaRepository<TripExpenseReport, String> {

  Optional<TripExpenseReport> findByTripId(String tripId);
}
