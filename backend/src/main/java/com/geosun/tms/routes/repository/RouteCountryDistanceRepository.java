package com.geosun.tms.routes.repository;

import com.geosun.tms.routes.domain.RouteCountryDistance;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RouteCountryDistanceRepository
    extends JpaRepository<RouteCountryDistance, String> {
  List<RouteCountryDistance> findByRouteIdOrderByAlongRouteOrderAscCountryCodeAsc(Long routeId);

  void deleteByRouteId(Long routeId);
}
