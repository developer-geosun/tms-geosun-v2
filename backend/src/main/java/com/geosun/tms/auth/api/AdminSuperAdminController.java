package com.geosun.tms.auth.api;

import com.geosun.tms.auth.config.OpenApiConfig;
import com.geosun.tms.auth.dto.request.VerifySuperAdminPasswordRequest;
import com.geosun.tms.auth.dto.response.OperationSuccessResponse;
import com.geosun.tms.auth.service.SuperAdminPasswordService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Перевірка пароля суперадміна (лише роль ADMIN).
 */
@Tag(name = "Admin Super-Admin")
@RestController
@RequestMapping("/api/v1/admin/super-admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminSuperAdminController {

  private final SuperAdminPasswordService superAdminPasswordService;

  public AdminSuperAdminController(SuperAdminPasswordService superAdminPasswordService) {
    this.superAdminPasswordService = superAdminPasswordService;
  }

  @Operation(summary = "Verify super-admin password (step-up for sensitive operations)")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @PostMapping("/verify-password")
  public OperationSuccessResponse verifyPassword(
      @Valid @RequestBody VerifySuperAdminPasswordRequest body) {
    return superAdminPasswordService.verify(body);
  }
}
