package com.geosun.tms.auth.dto.response;

import java.time.Instant;

/** Адмін-представлення користувача (без passwordHash). */
public record UserAdminDto(
    String id,
    String email,
    String role,
    boolean active,
    boolean deleted,
    boolean emailVerified,
    Instant createdAt,
    Instant updatedAt,
    Instant deletedAt) {}
