package com.geosun.tms.routes.repository;

import com.geosun.tms.routes.domain.RouteRequestStatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RouteRequestStatusHistoryRepository
    extends JpaRepository<RouteRequestStatusHistory, String> {}
