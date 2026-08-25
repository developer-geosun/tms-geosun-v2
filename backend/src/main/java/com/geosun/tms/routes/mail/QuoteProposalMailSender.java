package com.geosun.tms.routes.mail;

import com.geosun.tms.auth.config.AppEmailProperties;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import java.nio.charset.StandardCharsets;
import org.springframework.mail.MailException;
import org.springframework.mail.MailPreparationException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/** Відправка пропозиції фрахту на email заявника. */
@Component
public class QuoteProposalMailSender {
  private static final String MAIL_SUBJECT = "Пропозиція фрахту / Freight proposal";

  private final JavaMailSender mailSender;
  private final AppEmailProperties emailProperties;

  public QuoteProposalMailSender(JavaMailSender mailSender, AppEmailProperties emailProperties) {
    this.mailSender = mailSender;
    this.emailProperties = emailProperties;
  }

  public void sendProposalEmail(String toAddress, String messageBody) throws MailException {
    if (toAddress == null) {
      throw new NullPointerException("toAddress must not be null");
    }
    String recipient = toAddress.trim();
    if (recipient == null || !StringUtils.hasText(recipient)) {
      throw new MailPreparationException("Recipient email is empty");
    }
    String body = messageBody == null ? "" : messageBody.trim();
    if (body == null) {
      throw new NullPointerException("message body must not be null");
    }
    String fromAddress = emailProperties.getFrom();
    if (fromAddress == null) {
      throw new NullPointerException("from address must not be null");
    }
    MimeMessage message = mailSender.createMimeMessage();
    try {
      MimeMessageHelper helper =
          new MimeMessageHelper(message, false, StandardCharsets.UTF_8.name());
      helper.setFrom(fromAddress);
      helper.setTo(recipient);
      helper.setSubject(MAIL_SUBJECT);
      helper.setText(body, false);
    } catch (MessagingException ex) {
      throw new MailPreparationException("Failed to prepare quote proposal email", ex);
    }
    mailSender.send(message);
  }
}
