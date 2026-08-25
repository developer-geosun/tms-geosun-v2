package com.geosun.tms.reference.api;

import com.geosun.tms.auth.config.OpenApiConfig;
import com.geosun.tms.reference.dto.response.CountryReferenceDto;
import com.geosun.tms.reference.service.CountryReferenceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Admin Country Reference")
@RestController
@RequestMapping(ReferenceApiPaths.ADMIN_COUNTRY_REFERENCE_BASE)
@PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
public class AdminCountryReferenceController {
  private final CountryReferenceService countryReferenceService;

  public AdminCountryReferenceController(CountryReferenceService countryReferenceService) {
    this.countryReferenceService = countryReferenceService;
  }

  @Operation(summary = "List European countries reference (read-only)")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @GetMapping
  public List<CountryReferenceDto> list(@RequestParam(required = false) String search) {
    return countryReferenceService.list(search);
  }

  @Operation(summary = "Get country by ISO alpha-2 code")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @GetMapping("/{codeAlpha2}")
  public CountryReferenceDto getByCode(@PathVariable String codeAlpha2) {
    return countryReferenceService.getByCodeAlpha2(codeAlpha2);
  }
}
