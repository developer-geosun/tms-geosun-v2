package com.geosun.tms.auth.service;

import com.geosun.tms.auth.config.CleanupProperties;
import com.geosun.tms.auth.repository.EmailVerificationTokenRepository;
import com.geosun.tms.auth.repository.PasswordResetTokenRepository;
import com.geosun.tms.auth.repository.RefreshTokenRepository;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Фізичне видалення застарілих рядків токенів після періоду retention (ТЗ).
 */
@Service
public class TokenCleanupService {

  private static final Logger log = LoggerFactory.getLogger(TokenCleanupService.class);

  private final EmailVerificationTokenRepository emailVerificationTokenRepository;
  private final PasswordResetTokenRepository passwordResetTokenRepository;
  private final RefreshTokenRepository refreshTokenRepository;
  private final CleanupProperties cleanupProperties;

  public TokenCleanupService(
      EmailVerificationTokenRepository emailVerificationTokenRepository,
      PasswordResetTokenRepository passwordResetTokenRepository,
      RefreshTokenRepository refreshTokenRepository,
      CleanupProperties cleanupProperties) {
    this.emailVerificationTokenRepository = emailVerificationTokenRepository;
    this.passwordResetTokenRepository = passwordResetTokenRepository;
    this.refreshTokenRepository = refreshTokenRepository;
    this.cleanupProperties = cleanupProperties;
  }

  @Transactional
  public void purgeOldTokenRows() {
    long days = cleanupProperties.getTokenRetentionDays();
    if (days < 0) {
      log.warn("Token cleanup skipped: tokenRetentionDays is negative");
      return;
    }
    Instant cutoff = Instant.now().minus(days, ChronoUnit.DAYS);

    int verificationRemoved = emailVerificationTokenRepository.deleteExpiredOrUsedBefore(cutoff);
    int passwordResetRemoved = passwordResetTokenRepository.deleteExpiredOrUsedBefore(cutoff);
    int refreshRemoved = refreshTokenRepository.deleteRevokedOrExpiredBefore(cutoff);

    log.info(
        "Token cleanup finished: removed {} email_verification_tokens, {} password_reset_tokens"
            + " and {} refresh_tokens (retention {} days, cutoff {})",
        verificationRemoved,
        passwordResetRemoved,
        refreshRemoved,
        days,
        cutoff);
  }
}
