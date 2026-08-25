package com.geosun.tms.auth.api;

import com.geosun.tms.auth.config.OpenApiConfig;
import com.geosun.tms.auth.domain.user.Role;
import com.geosun.tms.auth.dto.request.AdminUserListQuery;
import com.geosun.tms.auth.dto.request.UpdateUserActiveRequest;
import com.geosun.tms.auth.dto.request.UpdateUserRoleRequest;
import com.geosun.tms.auth.dto.response.PageResponse;
import com.geosun.tms.auth.dto.response.UserAdminDto;
import com.geosun.tms.auth.security.UserPrincipal;
import com.geosun.tms.auth.service.AdminUserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.lang.NonNull;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Адмін-управління користувачами (лише ADMIN).
 */
@Tag(name = "Admin Users")
@RestController
@RequestMapping("/api/v1/admin/users")
@PreAuthorize("hasRole('ADMIN')")
public class AdminUserController {

  private final AdminUserService adminUserService;

  public AdminUserController(AdminUserService adminUserService) {
    this.adminUserService = adminUserService;
  }

  @Operation(summary = "List users with filters and pagination")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @GetMapping
  public PageResponse<UserAdminDto> list(
      @RequestParam(required = false) String email,
      @RequestParam(required = false) Role role,
      @RequestParam(required = false) Boolean active,
      @RequestParam(required = false) Boolean deleted,
      @RequestParam(defaultValue = "createdAt") String sort,
      @RequestParam(defaultValue = "desc") String order,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {
    return adminUserService.list(
        new AdminUserListQuery(email, role, active, deleted, sort, order, page, size));
  }

  @Operation(summary = "Get user by id")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @GetMapping("/{id}")
  public UserAdminDto getById(@PathVariable("id") @NonNull String id) {
    return adminUserService.getById(id);
  }

  @Operation(
      summary = "Update user role",
      description =
          "Demoting ADMIN to another role requires superAdminPassword (SUPER_ADMIN_PASSWORD).")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @PatchMapping("/{id}/role")
  public UserAdminDto updateRole(
      @AuthenticationPrincipal UserPrincipal principal,
      @PathVariable("id") @NonNull String id,
      @Valid @RequestBody UpdateUserRoleRequest body) {
    return adminUserService.updateRole(
        principal.getUserId(), id, body.role(), body.superAdminPassword());
  }

  @Operation(summary = "Activate or deactivate user")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @PatchMapping("/{id}/active")
  public UserAdminDto setActive(
      @AuthenticationPrincipal UserPrincipal principal,
      @PathVariable("id") @NonNull String id,
      @Valid @RequestBody UpdateUserActiveRequest body) {
    return adminUserService.setActive(principal.getUserId(), id, body.active());
  }

  @Operation(summary = "Soft-delete user", description = "ADMIN only; idempotent 204.")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @DeleteMapping("/{id}")
  public ResponseEntity<Void> softDelete(
      @AuthenticationPrincipal UserPrincipal principal, @PathVariable("id") @NonNull String id) {
    adminUserService.softDelete(principal.getUserId(), id);
    return ResponseEntity.noContent().build();
  }

  @Operation(
      summary = "Restore soft-deleted user",
      description = "ADMIN only; clears deleted flag and reactivates. Idempotent if not deleted.")
  @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
  @PostMapping("/{id}/restore")
  public UserAdminDto restore(
      @AuthenticationPrincipal UserPrincipal principal, @PathVariable("id") @NonNull String id) {
    return adminUserService.restore(principal.getUserId(), id);
  }
}
