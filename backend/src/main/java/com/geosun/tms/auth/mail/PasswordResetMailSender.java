package com.geosun.tms.auth.mail;

import com.geosun.tms.auth.config.AppEmailProperties;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.mail.MailException;
import org.springframework.mail.MailPreparationException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;
import org.springframework.util.StreamUtils;

/**
 * Відправка листа з посиланням для скидання пароля (без логування токена).
 */
@Component
public class PasswordResetMailSender {
  private static final String TEMPLATE_TOKEN = "{{RESET_LINK}}";
  private static final String MAIL_SUBJECT = "Password reset / Сброс пароля / Скидання пароля";
  private static final Resource PLAIN_TEMPLATE_RESOURCE =
      new ClassPathResource("mail/password-reset-email.txt");
  private static final Resource HTML_TEMPLATE_RESOURCE =
      new ClassPathResource("mail/password-reset-email.html");

  private final JavaMailSender mailSender;
  private final AppEmailProperties emailProperties;

  public PasswordResetMailSender(JavaMailSender mailSender, AppEmailProperties emailProperties) {
    this.mailSender = mailSender;
    this.emailProperties = emailProperties;
  }

  public void sendPasswordResetEmail(String toAddress, String rawToken) throws MailException {
    if (toAddress == null) {
      throw new NullPointerException("toAddress must not be null");
    }
    if (rawToken == null) {
      throw new NullPointerException("rawToken must not be null");
    }
    String fromAddress = emailProperties.getFrom();
    if (fromAddress == null) {
      throw new NullPointerException("from address must not be null");
    }
    String resetLink = buildResetLink(emailProperties.resolvePasswordResetLinkBase(), rawToken);
    MimeMessage message = mailSender.createMimeMessage();
    try {
      MimeMessageHelper helper =
          new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());
      helper.setFrom(fromAddress);
      helper.setTo(toAddress);
      helper.setSubject(MAIL_SUBJECT);
      String plainBody = buildPlainTextBody(resetLink);
      String htmlBody = buildHtmlBody(resetLink);
      if (plainBody == null || htmlBody == null) {
        throw new MailPreparationException("Password reset email body must not be null");
      }
      helper.setText(plainBody, htmlBody);
    } catch (MessagingException | IOException ex) {
      throw new MailPreparationException("Failed to prepare password reset email", ex);
    }
    mailSender.send(message);
  }

  private static String buildPlainTextBody(String resetLink) throws IOException {
    return readTemplate(PLAIN_TEMPLATE_RESOURCE).replace(TEMPLATE_TOKEN, resetLink);
  }

  private static String buildHtmlBody(String resetLink) throws IOException {
    return readTemplate(HTML_TEMPLATE_RESOURCE).replace(TEMPLATE_TOKEN, resetLink);
  }

  private static String readTemplate(Resource resource) throws IOException {
    try (var inputStream = resource.getInputStream()) {
      var utf8 = StandardCharsets.UTF_8;
      if (utf8 == null) {
        throw new IllegalStateException("UTF-8 charset must be available");
      }
      return StreamUtils.copyToString(inputStream, utf8);
    }
  }

  private static String buildResetLink(String resetLinkBase, String rawToken) {
    String sanitizedBase =
        resetLinkBase == null || resetLinkBase.isBlank()
            ? "http://localhost:4200/reset-password"
            : resetLinkBase.trim();
    String delimiter = sanitizedBase.contains("?") ? "&" : "?";
    return sanitizedBase
        + delimiter
        + "token="
        + URLEncoder.encode(rawToken, StandardCharsets.UTF_8);
  }
}
