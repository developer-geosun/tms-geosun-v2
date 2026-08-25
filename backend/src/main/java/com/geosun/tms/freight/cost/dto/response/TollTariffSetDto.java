package com.geosun.tms.freight.cost.dto.response;

public record TollTariffSetDto(
    String id,
    String name,
    String description,
    boolean isActive,
    String createdAt,
    String updatedAt) {}
