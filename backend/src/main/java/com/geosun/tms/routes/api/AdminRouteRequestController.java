package com.geosun.tms.routes.api;

import com.geosun.tms.auth.config.OpenApiConfig;
import com.geosun.tms.routes.dto.RouteRequestStatus;
import com.geosun.tms.routes.dto.request.AdminRouteRequestListQuery;
import com.geosun.tms.routes.dto.request.CountryBreakdownRequest;
import com.geosun.tms.routes.dto.response.PageResponse;
import com.geosun.tms.routes.dto.response.RouteRequestDto;
import com.geosun.tms.routes.service.RouteRequestService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Admin Route Requests")
@RestController
@RequestMapping(RoutesApiPaths.ADMIN_ROUTE_REQUESTS_BASE)
@PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
public class AdminRouteRequestController {
  private final RouteRequestService routeRequestService;

  public AdminRouteRequestController(RouteRequestService routeRequestService) {
    this.routeRequestService = routeRequestService;
  }

  @Operation(summary = "List all route requests for admin/manager")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @GetMapping
  public PageResponse<RouteRequestDto> getAllRequests(
      @RequestParam(required = false) RouteRequestStatus status,
      @RequestParam(required = false) String createdFrom,
      @RequestParam(required = false) String createdTo,
      @RequestParam(required = false) String ownerEmail,
      @RequestParam(required = false) String routeTitle,
      @RequestParam(defaultValue = "createdAt") String sort,
      @RequestParam(defaultValue = "desc") String order,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {
    return routeRequestService.getAllRequestsForAdmin(
        new AdminRouteRequestListQuery(
            status, createdFrom, createdTo, ownerEmail, routeTitle, sort, order, page, size));
  }

  @Operation(summary = "List distinct owner emails of route requests")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @GetMapping("/owner-emails")
  public List<String> getOwnerEmails() {
    return routeRequestService.getOwnerEmailsForAdmin();
  }

  @Operation(summary = "Get route request details for admin/manager")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @GetMapping("/{requestId}")
  public RouteRequestDto getRequestById(@PathVariable Long requestId) {
    return routeRequestService.getRequestByIdForAdmin(requestId);
  }

  @Operation(summary = "Recalculate country distance breakdown (HERE) for route request")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @PostMapping("/{requestId}/country-breakdown")
  public RouteRequestDto recalculateCountryBreakdown(
      @PathVariable Long requestId, @RequestBody(required = false) CountryBreakdownRequest body) {
    return routeRequestService.recalculateCountryBreakdownForAdmin(requestId, body);
  }
}
