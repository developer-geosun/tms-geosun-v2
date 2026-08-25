package com.geosun.tms.auth.dto.request;

import jakarta.validation.constraints.NotNull;

/** Тіло {@code PATCH /api/v1/admin/users/{id}/active}. */
public record UpdateUserActiveRequest(@NotNull Boolean active) {}
