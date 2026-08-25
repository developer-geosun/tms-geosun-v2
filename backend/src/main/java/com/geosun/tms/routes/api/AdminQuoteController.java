package com.geosun.tms.routes.api;

import com.geosun.tms.auth.config.OpenApiConfig;
import com.geosun.tms.auth.security.UserPrincipal;
import com.geosun.tms.routes.dto.request.CreateQuoteRequest;
import com.geosun.tms.routes.dto.request.SendQuoteRequest;
import com.geosun.tms.routes.dto.response.QuoteDto;
import com.geosun.tms.routes.service.FreightQuoteService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.lang.NonNull;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Admin Quotes")
@RestController
@PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
public class AdminQuoteController {
  private final FreightQuoteService freightQuoteService;

  public AdminQuoteController(FreightQuoteService freightQuoteService) {
    this.freightQuoteService = freightQuoteService;
  }

  @Operation(summary = "Create draft quote for route request")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @PostMapping(RoutesApiPaths.ADMIN_ROUTE_REQUESTS_BASE + "/{requestId}/quotes")
  public ResponseEntity<QuoteDto> createDraftQuote(
      @AuthenticationPrincipal @NonNull UserPrincipal principal,
      @PathVariable @NonNull Long requestId,
      @RequestHeader(name = "Idempotency-Key")
          @Parameter(description = "Idempotency key for create operation")
          @NonNull
          String idempotencyKey,
      @Valid @RequestBody @NonNull CreateQuoteRequest request) {
    String adminUserId = principal.getUserId();
    if (adminUserId == null) {
      throw new IllegalArgumentException("adminUserId must not be null");
    }
    QuoteDto quote =
        freightQuoteService.createDraftQuote(requestId, adminUserId, idempotencyKey, request);
    return ResponseEntity.status(HttpStatus.CREATED).body(quote);
  }

  @Operation(summary = "Send draft quote")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @PostMapping(RoutesApiPaths.ADMIN_QUOTES_BASE + "/{quoteId}/send")
  public QuoteDto sendQuote(
      @AuthenticationPrincipal @NonNull UserPrincipal principal,
      @PathVariable @NonNull String quoteId,
      @RequestHeader(name = "Idempotency-Key")
          @Parameter(description = "Idempotency key for send operation")
          @NonNull
          String idempotencyKey,
      @RequestBody(required = false) SendQuoteRequest request) {
    String adminUserId = principal.getUserId();
    if (adminUserId == null) {
      throw new IllegalArgumentException("adminUserId must not be null");
    }
    String messageBody = request == null ? null : request.messageBody();
    return freightQuoteService.sendQuote(quoteId, adminUserId, idempotencyKey, messageBody);
  }

  @Operation(summary = "List quote history for route request")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @GetMapping(RoutesApiPaths.ADMIN_ROUTE_REQUESTS_BASE + "/{requestId}/quotes")
  public List<QuoteDto> getQuotesHistory(@PathVariable @NonNull Long requestId) {
    return freightQuoteService.getQuotesForRequest(requestId);
  }
}
