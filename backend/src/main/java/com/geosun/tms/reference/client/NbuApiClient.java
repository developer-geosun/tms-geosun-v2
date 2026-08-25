package com.geosun.tms.reference.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.geosun.tms.auth.exception.ApiException;
import com.geosun.tms.reference.config.NbuExchangeRateProperties;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

@Component
public class NbuApiClient {
  private static final DateTimeFormatter NBU_DATE_QUERY = DateTimeFormatter.ofPattern("yyyyMMdd");
  private static final DateTimeFormatter NBU_DATE_RESPONSE =
      DateTimeFormatter.ofPattern("dd.MM.yyyy");

  private final RestTemplate restTemplate;
  private final NbuExchangeRateProperties properties;

  public NbuApiClient(
      RestTemplateBuilder restTemplateBuilder, NbuExchangeRateProperties properties) {
    this.properties = properties;
    this.restTemplate =
        restTemplateBuilder
            .setConnectTimeout(java.time.Duration.ofMillis(properties.getTimeoutMillis()))
            .setReadTimeout(java.time.Duration.ofMillis(properties.getTimeoutMillis()))
            .build();
  }

  public List<NbuRateRow> fetchRatesForDate(LocalDate date) {
    String url =
        UriComponentsBuilder.fromHttpUrl(properties.exchangeRatesPath())
            .queryParam("date", date.format(NBU_DATE_QUERY))
            .queryParam("json")
            .toUriString();
    try {
      ResponseEntity<JsonNode> response = restTemplate.getForEntity(url, JsonNode.class);
      JsonNode body = response.getBody();
      if (body == null || !body.isArray() || body.isEmpty()) {
        return List.of();
      }
      return parseRows(body);
    } catch (RestClientException ex) {
      throw ApiException.serviceUnavailable(
          "NBU_API_ERROR", "Не вдалося отримати курси НБУ: " + ex.getMessage());
    }
  }

  private List<NbuRateRow> parseRows(JsonNode array) {
    List<NbuRateRow> rows = new ArrayList<>();
    for (JsonNode node : array) {
      String cc = textOrNull(node, "cc");
      if (cc == null || cc.isBlank()) {
        continue;
      }
      String exchangeDateRaw = textOrNull(node, "exchangedate");
      if (exchangeDateRaw == null) {
        continue;
      }
      LocalDate exchangeDate = LocalDate.parse(exchangeDateRaw, NBU_DATE_RESPONSE);
      BigDecimal rate = node.has("rate") ? node.get("rate").decimalValue() : null;
      if (rate == null) {
        continue;
      }
      String special = textOrNull(node, "special");
      rows.add(new NbuRateRow(cc.toUpperCase(Locale.ROOT), rate, exchangeDate, special));
    }
    return rows;
  }

  private static String textOrNull(JsonNode node, String field) {
    if (!node.has(field) || node.get(field).isNull()) {
      return null;
    }
    return node.get(field).asText();
  }
}
