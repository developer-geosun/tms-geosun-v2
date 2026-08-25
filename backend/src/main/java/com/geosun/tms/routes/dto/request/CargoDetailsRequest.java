package com.geosun.tms.routes.dto.request;

/**
 * Параметри вантажу у запиті на фрахт.
 */
public record CargoDetailsRequest(String type, Double weightKg, Double volumeM3) {}
