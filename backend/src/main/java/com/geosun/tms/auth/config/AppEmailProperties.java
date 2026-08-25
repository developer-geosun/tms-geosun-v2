package com.geosun.tms.auth.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.util.StringUtils;

/**
 * Параметри листів верифікації та скидання пароля (app.email.*).
 * Посилання в листах ведуть на frontend (локально або GitHub Pages), не на ngrok API.
 */
@ConfigurationProperties(prefix = "app.email")
public class AppEmailProperties {

  private static final String DEFAULT_VERIFICATION_LINK_BASE = "http://localhost:4200/verify-email";
  private static final String DEFAULT_PASSWORD_RESET_LINK_BASE =
      "http://localhost:4200/reset-password";

  private String from = "no-reply@example.com";

  private long verificationExpiresSeconds = 86400;

  private long passwordResetExpiresSeconds = 3600;

  /** База посилання верифікації (frontend URL). */
  private String verificationLinkBase = DEFAULT_VERIFICATION_LINK_BASE;

  /** База посилання скидання пароля (frontend URL). */
  private String passwordResetLinkBase = DEFAULT_PASSWORD_RESET_LINK_BASE;

  public String getFrom() {
    return from;
  }

  public void setFrom(String from) {
    this.from = from;
  }

  public long getVerificationExpiresSeconds() {
    return verificationExpiresSeconds;
  }

  public void setVerificationExpiresSeconds(long verificationExpiresSeconds) {
    this.verificationExpiresSeconds = verificationExpiresSeconds;
  }

  public long getPasswordResetExpiresSeconds() {
    return passwordResetExpiresSeconds;
  }

  public void setPasswordResetExpiresSeconds(long passwordResetExpiresSeconds) {
    this.passwordResetExpiresSeconds = passwordResetExpiresSeconds;
  }

  public String getVerificationLinkBase() {
    return verificationLinkBase;
  }

  public void setVerificationLinkBase(String verificationLinkBase) {
    this.verificationLinkBase = verificationLinkBase;
  }

  public String getPasswordResetLinkBase() {
    return passwordResetLinkBase;
  }

  public void setPasswordResetLinkBase(String passwordResetLinkBase) {
    this.passwordResetLinkBase = passwordResetLinkBase;
  }

  /** База посилання для листа верифікації email. */
  public String resolveVerificationLinkBase() {
    return resolveLinkBase(verificationLinkBase, DEFAULT_VERIFICATION_LINK_BASE);
  }

  /** База посилання для листа скидання пароля. */
  public String resolvePasswordResetLinkBase() {
    return resolveLinkBase(passwordResetLinkBase, DEFAULT_PASSWORD_RESET_LINK_BASE);
  }

  private static String resolveLinkBase(String fallbackBase, String defaultBase) {
    if (StringUtils.hasText(fallbackBase)) {
      return fallbackBase.trim();
    }
    return defaultBase;
  }
}
