package com.geosun.tms.reference.domain;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import java.util.ArrayList;
import java.util.List;

/** Серіалізує {@link List}<{@link DocumentTypeFieldDefinition}> у JSON для колонки field_definitions. */
@Converter(autoApply = false)
public class DocumentTypeFieldDefinitionsConverter
    implements AttributeConverter<List<DocumentTypeFieldDefinition>, String> {

  private static final ObjectMapper MAPPER = new ObjectMapper();
  private static final TypeReference<List<DocumentTypeFieldDefinition>> TYPE =
      new TypeReference<>() {};

  @Override
  public String convertToDatabaseColumn(List<DocumentTypeFieldDefinition> attribute) {
    if (attribute == null || attribute.isEmpty()) {
      return "[]";
    }
    try {
      return MAPPER.writeValueAsString(attribute);
    } catch (Exception ex) {
      throw new IllegalStateException("Failed to serialize document type field definitions", ex);
    }
  }

  @Override
  public List<DocumentTypeFieldDefinition> convertToEntityAttribute(String dbData) {
    if (dbData == null || dbData.isBlank()) {
      return new ArrayList<>();
    }
    try {
      List<DocumentTypeFieldDefinition> parsed = MAPPER.readValue(dbData, TYPE);
      return parsed == null ? new ArrayList<>() : new ArrayList<>(parsed);
    } catch (Exception ex) {
      throw new IllegalStateException("Failed to deserialize document type field definitions", ex);
    }
  }
}
