package com.geosun.tms.auth.dto.request;

import com.geosun.tms.auth.domain.user.Role;
import jakarta.validation.constraints.NotNull;
import org.springframework.lang.NonNull;

/** Тіло {@code PATCH /api/v1/admin/users/{id}/role}. */
public record UpdateUserRoleRequest(@NotNull @NonNull Role role) {}
