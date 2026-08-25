package com.geosun.tms.routes.api;

import com.geosun.tms.auth.config.OpenApiConfig;
import com.geosun.tms.auth.security.UserPrincipal;
import com.geosun.tms.routes.dto.request.CreateRouteRequestRequest;
import com.geosun.tms.routes.dto.response.RouteRequestDto;
import com.geosun.tms.routes.service.RouteRequestService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Route Requests")
@RestController
@RequestMapping(RoutesApiPaths.ROUTE_REQUESTS_BASE)
public class RouteRequestController {
  private final RouteRequestService routeRequestService;

  public RouteRequestController(RouteRequestService routeRequestService) {
    this.routeRequestService = routeRequestService;
  }

  @Operation(summary = "Create route request for current user")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @PostMapping
  public ResponseEntity<RouteRequestDto> createRouteRequest(
      @AuthenticationPrincipal UserPrincipal principal,
      @Valid @RequestBody CreateRouteRequestRequest request) {
    RouteRequestDto response =
        routeRequestService.createRouteRequest(principal.getUserId(), request);
    return ResponseEntity.status(HttpStatus.CREATED).body(response);
  }

  @Operation(summary = "List my route requests")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @GetMapping("/my")
  public List<RouteRequestDto> getMyRouteRequests(
      @AuthenticationPrincipal UserPrincipal principal) {
    return routeRequestService.getMyRouteRequests(principal.getUserId());
  }

  @Operation(summary = "Get my route request by id")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @GetMapping("/my/{requestId}")
  public RouteRequestDto getMyRouteRequestById(
      @AuthenticationPrincipal UserPrincipal principal, @PathVariable Long requestId) {
    return routeRequestService.getMyRouteRequestById(principal.getUserId(), requestId);
  }
}
