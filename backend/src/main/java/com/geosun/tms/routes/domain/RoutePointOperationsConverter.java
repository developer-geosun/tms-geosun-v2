package com.geosun.tms.routes.domain;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import java.util.ArrayList;
import java.util.List;

/**
 * Серіалізує {@link List}<{@link RoutePointOperation}> у JSON-рядок для зберігання у БД та назад.
 *
 * <p>Колонка має тип {@code TEXT} — формат JSON-масиву строкових імен enum (наприклад {@code
 * ["LOADING","EXPORT_CUSTOMS"]}).
 */
@Converter(autoApply = false)
public class RoutePointOperationsConverter
    implements AttributeConverter<List<RoutePointOperation>, String> {

  private static final ObjectMapper MAPPER = new ObjectMapper();
  private static final TypeReference<List<RoutePointOperation>> TYPE = new TypeReference<>() {};

  @Override
  public String convertToDatabaseColumn(List<RoutePointOperation> attribute) {
    if (attribute == null || attribute.isEmpty()) {
      return "[]";
    }
    try {
      return MAPPER.writeValueAsString(attribute);
    } catch (Exception ex) {
      throw new IllegalStateException("Failed to serialize route point operations", ex);
    }
  }

  @Override
  public List<RoutePointOperation> convertToEntityAttribute(String dbData) {
    if (dbData == null || dbData.isBlank()) {
      return new ArrayList<>();
    }
    try {
      List<RoutePointOperation> parsed = MAPPER.readValue(dbData, TYPE);
      return parsed == null ? new ArrayList<>() : new ArrayList<>(parsed);
    } catch (Exception ex) {
      throw new IllegalStateException("Failed to deserialize route point operations", ex);
    }
  }
}
