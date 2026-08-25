package com.geosun.tms.auth.dto.response;

import java.util.List;

/** Сторінка результатів для admin list endpoints. */
public record PageResponse<T>(
    List<T> content, long totalElements, int totalPages, int page, int size) {}
