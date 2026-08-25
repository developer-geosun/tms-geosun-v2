package com.geosun.tms.auth.dto.request;

import jakarta.validation.constraints.NotBlank;

/**
 * Тіло {@code POST /api/v1/auth/reset-password-info}.
 */
public record PasswordResetInfoRequest(@NotBlank String token) {}
