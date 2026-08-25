package com.geosun.tms.freight.cost.api;

import com.geosun.tms.auth.config.OpenApiConfig;
import com.geosun.tms.auth.security.UserPrincipal;
import com.geosun.tms.freight.cost.dto.request.CreateCountryTollRuleRequest;
import com.geosun.tms.freight.cost.dto.request.CreateTollTariffSetRequest;
import com.geosun.tms.freight.cost.dto.request.UpdateCountryTollRuleRequest;
import com.geosun.tms.freight.cost.dto.request.UpdateTollTariffSetRequest;
import com.geosun.tms.freight.cost.dto.response.CountryTollRuleDto;
import com.geosun.tms.freight.cost.dto.response.TollTariffSetDto;
import com.geosun.tms.freight.cost.service.TollTariffSetService;
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

@Tag(name = "Admin Toll Tariff Sets")
@RestController
@RequestMapping(FreightCostApiPaths.ADMIN_TOLL_TARIFF_SETS_BASE)
@PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
public class AdminTollTariffSetController {
  private final TollTariffSetService tollTariffSetService;

  public AdminTollTariffSetController(TollTariffSetService tollTariffSetService) {
    this.tollTariffSetService = tollTariffSetService;
  }

  @Operation(summary = "List toll tariff sets")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @GetMapping
  public List<TollTariffSetDto> list(
      @RequestParam(name = "activeOnly", defaultValue = "false") boolean activeOnly) {
    return tollTariffSetService.list(activeOnly);
  }

  @Operation(summary = "Get toll tariff set by id")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @GetMapping("/{id}")
  public TollTariffSetDto getById(@PathVariable String id) {
    return tollTariffSetService.getById(id);
  }

  @Operation(summary = "Create toll tariff set")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @PostMapping
  public ResponseEntity<TollTariffSetDto> create(
      @AuthenticationPrincipal @NonNull UserPrincipal principal,
      @Valid @RequestBody @NonNull CreateTollTariffSetRequest request) {
    String userId = Objects.requireNonNull(principal.getUserId());
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(tollTariffSetService.create(userId, request));
  }

  @Operation(summary = "Update toll tariff set")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @PutMapping("/{id}")
  public TollTariffSetDto update(
      @AuthenticationPrincipal @NonNull UserPrincipal principal,
      @PathVariable String id,
      @Valid @RequestBody @NonNull UpdateTollTariffSetRequest request) {
    String userId = Objects.requireNonNull(principal.getUserId());
    return tollTariffSetService.update(userId, id, request);
  }

  @Operation(summary = "Delete or deactivate toll tariff set")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(@PathVariable String id) {
    tollTariffSetService.delete(id);
    return ResponseEntity.noContent().build();
  }

  @Operation(summary = "List country toll rules in set")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @GetMapping("/{setId}/country-toll-rules")
  public List<CountryTollRuleDto> listRules(@PathVariable String setId) {
    return tollTariffSetService.listRules(setId);
  }

  @Operation(summary = "Create country toll rule in set")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @PostMapping("/{setId}/country-toll-rules")
  public ResponseEntity<CountryTollRuleDto> createRule(
      @AuthenticationPrincipal @NonNull UserPrincipal principal,
      @PathVariable String setId,
      @Valid @RequestBody @NonNull CreateCountryTollRuleRequest request) {
    String userId = Objects.requireNonNull(principal.getUserId());
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(tollTariffSetService.createRule(userId, setId, request));
  }

  @Operation(summary = "Update country toll rule")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @PutMapping("/{setId}/country-toll-rules/{ruleId}")
  public CountryTollRuleDto updateRule(
      @PathVariable String setId,
      @PathVariable String ruleId,
      @Valid @RequestBody @NonNull UpdateCountryTollRuleRequest request) {
    return tollTariffSetService.updateRule(setId, ruleId, request);
  }

  @Operation(summary = "Delete country toll rule")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @DeleteMapping("/{setId}/country-toll-rules/{ruleId}")
  public ResponseEntity<Void> deleteRule(@PathVariable String setId, @PathVariable String ruleId) {
    tollTariffSetService.deleteRule(setId, ruleId);
    return ResponseEntity.noContent().build();
  }
}
