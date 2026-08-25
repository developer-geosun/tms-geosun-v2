package com.geosun.tms.auth.dto.request;

import jakarta.validation.constraints.NotBlank;

/**
 * Тіло {@code POST /api/v1/admin/super-admin/verify-password}.
 */
public record VerifySuperAdminPasswordRequest(@NotBlank String password) {}
