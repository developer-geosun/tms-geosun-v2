package com.geosun.tms.freight.cost.api;

import com.geosun.tms.auth.config.OpenApiConfig;
import com.geosun.tms.auth.security.UserPrincipal;
import com.geosun.tms.freight.cost.dto.request.CreateFreightNumericScenarioRequest;
import com.geosun.tms.freight.cost.dto.request.UpdateFreightNumericScenarioRequest;
import com.geosun.tms.freight.cost.dto.response.FreightNumericScenarioDto;
import com.geosun.tms.freight.cost.service.FreightNumericScenarioService;
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
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Admin Freight Numeric Scenarios")
@RestController
@RequestMapping(FreightCostApiPaths.ADMIN_NUMERIC_SCENARIOS_BASE)
@PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
public class AdminFreightNumericScenarioController {
  private final FreightNumericScenarioService scenarioService;

  public AdminFreightNumericScenarioController(FreightNumericScenarioService scenarioService) {
    this.scenarioService = scenarioService;
  }

  @Operation(summary = "List freight numeric scenarios")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @GetMapping
  public List<FreightNumericScenarioDto> list(
      @RequestParam(name = "activeOnly", defaultValue = "false") boolean activeOnly) {
    return scenarioService.list(activeOnly);
  }

  @Operation(summary = "Get numeric scenario by id")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @GetMapping("/{id}")
  public FreightNumericScenarioDto getById(@PathVariable String id) {
    return scenarioService.getById(id);
  }

  @Operation(summary = "Create numeric scenario")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @PostMapping
  public ResponseEntity<FreightNumericScenarioDto> create(
      @AuthenticationPrincipal @NonNull UserPrincipal principal,
      @Valid @RequestBody @NonNull CreateFreightNumericScenarioRequest request) {
    String userId = Objects.requireNonNull(principal.getUserId());
    return ResponseEntity.status(HttpStatus.CREATED).body(scenarioService.create(userId, request));
  }

  @Operation(summary = "Update numeric scenario")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @PutMapping("/{id}")
  public FreightNumericScenarioDto update(
      @AuthenticationPrincipal @NonNull UserPrincipal principal,
      @PathVariable String id,
      @Valid @RequestBody @NonNull UpdateFreightNumericScenarioRequest request) {
    String userId = Objects.requireNonNull(principal.getUserId());
    return scenarioService.update(userId, id, request);
  }

  @Operation(summary = "Delete or deactivate numeric scenario")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(@PathVariable String id) {
    scenarioService.delete(id);
    return ResponseEntity.noContent().build();
  }
}
