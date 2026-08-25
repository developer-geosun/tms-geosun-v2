package com.geosun.tms.auth.dto.request;

import com.geosun.tms.auth.domain.user.Role;

/** Параметри списку користувачів для ADMIN. */
public record AdminUserListQuery(
    String email,
    Role role,
    Boolean active,
    Boolean deleted,
    String sort,
    String order,
    int page,
    int size) {}
