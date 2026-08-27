package com.geosun.tms.reference.dto.request;

import jakarta.validation.constraints.NotBlank;

public record LinkDriverUserRequest(@NotBlank String userId) {}
