package com.geosun.tms.freight.cost.api;

import com.geosun.tms.auth.config.OpenApiConfig;
import com.geosun.tms.auth.security.UserPrincipal;
import com.geosun.tms.freight.cost.dto.request.CostPreviewRequest;
import com.geosun.tms.freight.cost.dto.response.CostPreviewResponse;
import com.geosun.tms.freight.cost.dto.response.FreightCostCalculationDto;
import com.geosun.tms.freight.cost.service.FreightCostPreviewService;
import com.geosun.tms.routes.api.RoutesApiPaths;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Objects;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.lang.NonNull;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Admin Freight Cost Calculations")
@RestController
@PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
public class AdminFreightCostCalculationController {
  private final FreightCostPreviewService previewService;

  public AdminFreightCostCalculationController(FreightCostPreviewService previewService) {
    this.previewService = previewService;
  }

  @Operation(summary = "Preview and persist freight cost calculation")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @PostMapping(
      RoutesApiPaths.ADMIN_ROUTE_REQUESTS_BASE
          + "/{requestId}"
          + FreightCostApiPaths.ADMIN_ROUTE_REQUESTS_COST_PREVIEW_SUFFIX)
  public ResponseEntity<CostPreviewResponse> costPreview(
      @AuthenticationPrincipal @NonNull UserPrincipal principal,
      @PathVariable Long requestId,
      @Valid @RequestBody @NonNull CostPreviewRequest request) {
    String userId = Objects.requireNonNull(principal.getUserId());
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(previewService.preview(userId, requestId, request));
  }

  @Operation(summary = "List cost calculations for route request")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @GetMapping(
      RoutesApiPaths.ADMIN_ROUTE_REQUESTS_BASE
          + "/{requestId}"
          + FreightCostApiPaths.ADMIN_ROUTE_REQUESTS_COST_CALCULATIONS_SUFFIX)
  public List<FreightCostCalculationDto> list(@PathVariable Long requestId) {
    return previewService.listForRequest(requestId);
  }

  @Operation(summary = "Get cost calculation by id")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @GetMapping(
      RoutesApiPaths.ADMIN_ROUTE_REQUESTS_BASE
          + "/{requestId}"
          + FreightCostApiPaths.ADMIN_ROUTE_REQUESTS_COST_CALCULATIONS_SUFFIX
          + "/{calculationId}")
  public FreightCostCalculationDto getById(
      @PathVariable Long requestId, @PathVariable String calculationId) {
    return previewService.getById(requestId, calculationId);
  }

  @Operation(summary = "Delete cost calculation from history")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @DeleteMapping(
      RoutesApiPaths.ADMIN_ROUTE_REQUESTS_BASE
          + "/{requestId}"
          + FreightCostApiPaths.ADMIN_ROUTE_REQUESTS_COST_CALCULATIONS_SUFFIX
          + "/{calculationId}")
  public ResponseEntity<Void> delete(
      @PathVariable Long requestId, @PathVariable String calculationId) {
    previewService.delete(requestId, calculationId);
    return ResponseEntity.noContent().build();
  }
}
