package com.geosun.tms.routes.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.country-breakdown")
public final class CountryBreakdownProperties {
  private final Provider provider;

  public CountryBreakdownProperties(Provider provider) {
    this.provider = provider == null ? Provider.HERE : provider;
  }

  public Provider provider() {
    return provider;
  }

  public enum Provider {
    HERE,
    GEOJSON
  }
}
