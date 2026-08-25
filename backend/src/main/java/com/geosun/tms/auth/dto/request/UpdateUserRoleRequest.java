package com.geosun.tms.auth.dto.request;

import com.geosun.tms.auth.domain.user.Role;
import jakarta.validation.constraints.NotNull;
import org.springframework.lang.NonNull;
import org.springframework.lang.Nullable;

/**
 * Тіло {@code PATCH /api/v1/admin/users/{id}/role}.
 * {@code superAdminPassword} обов'язковий при зміні ролі з ADMIN на іншу.
 */
public record UpdateUserRoleRequest(
    @NotNull @NonNull Role role, @Nullable String superAdminPassword) {}
