package com.geosun.tms.auth.security.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Пароль суперадміна з application.yml / env ({@code SUPER_ADMIN_PASSWORD}).
 * Не є обліковим записом користувача — лише секрет для чутливих admin-операцій.
 */
@ConfigurationProperties(prefix = "app.security.super-admin")
public class SuperAdminProperties {

  /** Plaintext пароль з env; порожній = не налаштовано. */
  private String password = "";

  public String getPassword() {
    return password;
  }

  public void setPassword(String password) {
    this.password = password;
  }
}
