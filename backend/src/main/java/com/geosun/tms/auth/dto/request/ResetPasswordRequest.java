package com.geosun.tms.auth.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Тіло {@code POST /api/v1/auth/reset-password}.
 */
public record ResetPasswordRequest(
    @NotBlank String token,
    @NotBlank
        @Size(min = 8, message = "Password must be at least 8 characters")
        @Pattern(
            regexp = "^(?=.*[A-Za-z])(?=.*\\d).{8,}$",
            message = "Password must contain at least one letter and one digit")
        String newPassword) {}
