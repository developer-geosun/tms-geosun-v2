package com.geosun.tms.auth.service;

import com.geosun.tms.auth.dto.request.VerifySuperAdminPasswordRequest;
import com.geosun.tms.auth.dto.response.OperationSuccessResponse;
import com.geosun.tms.auth.exception.ApiException;
import com.geosun.tms.auth.security.config.SuperAdminProperties;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * Перевірка пароля суперадміна (env), без логіну як користувача.
 */
@Service
public class SuperAdminPasswordService {

  private final SuperAdminProperties superAdminProperties;

  public SuperAdminPasswordService(SuperAdminProperties superAdminProperties) {
    this.superAdminProperties = superAdminProperties;
  }

  /**
   * Вимагає коректний пароль суперадміна (для чутливих операцій у тому ж запиті).
   */
  public void requireValid(String password) {
    if (!StringUtils.hasText(password)) {
      throw ApiException.badRequest(
          "SUPER_ADMIN_PASSWORD_REQUIRED", "Super-admin password is required for this operation");
    }
    verify(new VerifySuperAdminPasswordRequest(password));
  }

  /**
   * Порівнює переданий пароль з {@code SUPER_ADMIN_PASSWORD} (constant-time).
   */
  public OperationSuccessResponse verify(VerifySuperAdminPasswordRequest request) {
    String configured = superAdminProperties.getPassword();
    if (!StringUtils.hasText(configured)) {
      throw ApiException.serviceUnavailable(
          "SUPER_ADMIN_PASSWORD_NOT_CONFIGURED", "Super-admin password is not configured");
    }

    byte[] expected = configured.getBytes(StandardCharsets.UTF_8);
    byte[] actual = request.password().getBytes(StandardCharsets.UTF_8);
    if (!MessageDigest.isEqual(expected, actual)) {
      throw ApiException.forbidden("INVALID_SUPER_ADMIN_PASSWORD", "Invalid super-admin password");
    }

    return new OperationSuccessResponse(true, "Super-admin password verified");
  }
}
