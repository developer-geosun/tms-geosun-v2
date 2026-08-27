package com.geosun.tms.trips.repository;

import com.geosun.tms.trips.domain.TripExpenseLine;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TripExpenseLineRepository extends JpaRepository<TripExpenseLine, String> {

  List<TripExpenseLine> findByReportIdOrderBySortOrderAscCreatedAtAsc(String reportId);

  Optional<TripExpenseLine> findByIdAndReportId(String id, String reportId);

  void deleteByReportId(String reportId);
}
