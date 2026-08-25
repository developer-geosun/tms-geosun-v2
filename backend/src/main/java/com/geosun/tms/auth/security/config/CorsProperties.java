package com.geosun.tms.auth.security.config;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.util.StringUtils;

/**
 * CORS: базові локальні origin та динамічні змінні з оточення
 * (GitHub Pages через CORS_ALLOWED_ORIGIN_PATTERNS тощо).
 * NGROK_DOMAIN більше не додається як frontend-origin: ngrok тунелює лише backend.
 */
@ConfigurationProperties(prefix = "app.cors")
public class CorsProperties {

  /** Додаткові шаблони через кому (змінна CORS_ALLOWED_ORIGIN_PATTERNS). */
  private String allowedOriginPatternsExtra = "";

  public String getAllowedOriginPatternsExtra() {
    return allowedOriginPatternsExtra;
  }

  public void setAllowedOriginPatternsExtra(String allowedOriginPatternsExtra) {
    this.allowedOriginPatternsExtra = allowedOriginPatternsExtra;
  }

  /** Повний список allowedOriginPatterns для CorsConfiguration. */
  public List<String> resolveAllowedOriginPatterns() {
    Set<String> patterns = new LinkedHashSet<>();
    patterns.add("http://localhost:4200");
    patterns.add("http://127.0.0.1:4200");
    patterns.add("http://localhost:8081");
    patterns.add("http://127.0.0.1:8081");
    patterns.add("http://localhost:8082");
    patterns.add("http://127.0.0.1:8082");
    for (String part : splitCommaSeparated(allowedOriginPatternsExtra)) {
      patterns.add(normalizeToOriginPattern(part));
    }
    return new ArrayList<>(patterns);
  }

  private static List<String> splitCommaSeparated(String csv) {
    if (!StringUtils.hasText(csv)) {
      return List.of();
    }
    return Arrays.stream(csv.split(","))
        .filter(part -> part != null)
        .map(part -> part.trim())
        .filter(StringUtils::hasText)
        .toList();
  }

  private static String normalizeToOriginPattern(String value) {
    if (value.startsWith("http://") || value.startsWith("https://")) {
      return value;
    }
    return "https://" + value;
  }
}
