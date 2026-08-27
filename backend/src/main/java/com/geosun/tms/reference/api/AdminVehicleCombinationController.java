package com.geosun.tms.reference.api;

import com.geosun.tms.auth.config.OpenApiConfig;
import com.geosun.tms.auth.exception.ApiException;
import com.geosun.tms.reference.domain.VehicleCombinationListView;
import com.geosun.tms.reference.dto.request.CreateVehicleCombinationRequest;
import com.geosun.tms.reference.dto.request.UpdateVehicleCombinationRequest;
import com.geosun.tms.reference.dto.response.VehicleCombinationDto;
import com.geosun.tms.reference.service.VehicleCombinationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.lang.NonNull;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Admin Vehicle Combinations")
@RestController
@RequestMapping(ReferenceApiPaths.ADMIN_VEHICLE_COMBINATIONS_BASE)
@PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
public class AdminVehicleCombinationController {

  private final VehicleCombinationService combinationService;

  public AdminVehicleCombinationController(VehicleCombinationService combinationService) {
    this.combinationService = combinationService;
  }

  @Operation(summary = "List vehicle combinations")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @GetMapping
  public List<VehicleCombinationDto> list(
      @RequestParam(name = "view", defaultValue = "active") String view) {
    try {
      return combinationService.list(VehicleCombinationListView.fromQueryParam(view));
    } catch (IllegalArgumentException ex) {
      throw ApiException.badRequest("VALIDATION_ERROR", ex.getMessage());
    }
  }

  @Operation(summary = "Get vehicle combination")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @GetMapping("/{id}")
  public VehicleCombinationDto get(@PathVariable("id") @NonNull String id) {
    return combinationService.getById(id);
  }

  @Operation(summary = "Create vehicle combination")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @PostMapping
  public ResponseEntity<VehicleCombinationDto> create(
      @Valid @RequestBody @NonNull CreateVehicleCombinationRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED).body(combinationService.create(request));
  }

  @Operation(summary = "Update vehicle combination")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @PutMapping("/{id}")
  public VehicleCombinationDto update(
      @PathVariable("id") @NonNull String id,
      @Valid @RequestBody @NonNull UpdateVehicleCombinationRequest request) {
    return combinationService.update(id, request);
  }

  @Operation(summary = "Soft-delete vehicle combination")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @DeleteMapping("/{id}")
  public ResponseEntity<Void> softDelete(@PathVariable("id") @NonNull String id) {
    combinationService.softDelete(id);
    return ResponseEntity.noContent().build();
  }

  @Operation(summary = "Restore vehicle combination")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @PostMapping("/{id}/restore")
  public VehicleCombinationDto restore(@PathVariable("id") @NonNull String id) {
    return combinationService.restore(id);
  }
}
