package com.geosun.tms.routes.dto.response;

import java.util.List;

public record PageResponse<T>(
    List<T> content, long totalElements, int totalPages, int page, int size) {}
