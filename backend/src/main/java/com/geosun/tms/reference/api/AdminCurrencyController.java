package com.geosun.tms.reference.api;

import com.geosun.tms.auth.config.OpenApiConfig;
import com.geosun.tms.reference.dto.request.UpdateCurrencyRequest;
import com.geosun.tms.reference.dto.response.CurrencyDto;
import com.geosun.tms.reference.dto.response.NbuRatesSnapshotDto;
import com.geosun.tms.reference.dto.response.SyncNbuRatesResponse;
import com.geosun.tms.reference.service.CurrencyService;
import com.geosun.tms.reference.service.NbuExchangeRateService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.lang.NonNull;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Admin Currencies")
@RestController
@RequestMapping(ReferenceApiPaths.ADMIN_CURRENCIES_BASE)
@PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
public class AdminCurrencyController {
  private final CurrencyService currencyService;
  private final NbuExchangeRateService nbuExchangeRateService;

  public AdminCurrencyController(
      CurrencyService currencyService, NbuExchangeRateService nbuExchangeRateService) {
    this.currencyService = currencyService;
    this.nbuExchangeRateService = nbuExchangeRateService;
  }

  @Operation(summary = "List currencies")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @GetMapping
  public List<CurrencyDto> list(
      @RequestParam(name = "activeOnly", defaultValue = "false") boolean activeOnly) {
    return currencyService.list(activeOnly);
  }

  @Operation(summary = "Update currency active flag")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @PatchMapping("/{code}")
  public CurrencyDto update(
      @PathVariable String code, @Valid @RequestBody @NonNull UpdateCurrencyRequest request) {
    return currencyService.update(code, request);
  }

  @Operation(summary = "Sync NBU exchange rates for active currencies")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @PostMapping("/nbu-rates/sync")
  public ResponseEntity<SyncNbuRatesResponse> syncNbuRates() {
    return ResponseEntity.status(HttpStatus.OK).body(nbuExchangeRateService.syncActiveCurrencies());
  }

  @Operation(summary = "Get latest stored NBU rates snapshot")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @GetMapping("/nbu-rates")
  public NbuRatesSnapshotDto getNbuRates(
      @RequestParam(name = "rateDate", required = false)
          @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
          LocalDate rateDate) {
    if (rateDate == null) {
      return nbuExchangeRateService.getLatestRates();
    }
    return nbuExchangeRateService.getRatesForDate(rateDate);
  }
}
