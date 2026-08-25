package com.geosun.tms.routes.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.here")
public final class HereProperties {
  private final String apiKey;
  private final String baseUrl;
  private final String transportMode;
  private final String routingMode;
  private final int timeoutMillis;
  private final long cacheTtlSeconds;

  public HereProperties(
      String apiKey,
      String baseUrl,
      String transportMode,
      String routingMode,
      int timeoutMillis,
      long cacheTtlSeconds) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.transportMode = transportMode;
    this.routingMode = routingMode;
    this.timeoutMillis = timeoutMillis;
    this.cacheTtlSeconds = cacheTtlSeconds;
  }

  public String apiKey() {
    return apiKey;
  }

  public String baseUrl() {
    return baseUrl;
  }

  public String transportMode() {
    return transportMode;
  }

  public String routingMode() {
    return routingMode;
  }

  public int timeoutMillis() {
    return timeoutMillis;
  }

  public long cacheTtlSeconds() {
    return cacheTtlSeconds;
  }
}
