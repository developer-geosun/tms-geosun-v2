package com.geosun.tms.routes.service;

import com.geosun.tms.routes.dto.RouteListView;
import com.geosun.tms.routes.dto.request.CreateRouteRequestRequest;
import com.geosun.tms.routes.dto.request.SaveRouteRequest;
import com.geosun.tms.routes.dto.response.RouteRequestDto;
import com.geosun.tms.routes.dto.response.RouteSnapshotDto;
import com.geosun.tms.routes.dto.response.RouteSummaryDto;
import java.util.List;

/**
 * Фасад контрактів Phase 0: формалізує майбутні use-case без реалізації.
 */
public interface RouteContractsFacade {
  RouteSnapshotDto saveRoute(String userId, SaveRouteRequest request);

  RouteSnapshotDto updateMyRoute(String userId, Long routeId, SaveRouteRequest request);

  default List<RouteSummaryDto> getMyRoutes(String userId) {
    return getMyRoutes(userId, RouteListView.ACTIVE);
  }

  List<RouteSummaryDto> getMyRoutes(String userId, RouteListView view);

  RouteSnapshotDto getMyRouteById(String userId, Long routeId);

  RouteRequestDto createRouteRequest(String userId, CreateRouteRequestRequest request);

  List<RouteRequestDto> getMyRouteRequests(String userId);
}
