package com.geosun.tms.auth.dto.response;

/**
 * Відповідь {@code POST /api/v1/auth/reset-password-info}.
 */
public record PasswordResetInfoResponse(String email) {}
