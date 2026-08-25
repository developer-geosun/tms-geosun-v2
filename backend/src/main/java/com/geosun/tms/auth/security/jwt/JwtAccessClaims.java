package com.geosun.tms.auth.security.jwt;

import java.time.Instant;
import org.springframework.lang.NonNull;

/**
 * Валідовані claims access JWT (sub + sessionId + час).
 */
public record JwtAccessClaims(
    @NonNull String subjectUserId,
    @NonNull String sessionId,
    Instant issuedAt,
    Instant expiresAt) {}
