package com.geosun.tms.reference.domain;

/** Один елемент JSON field_definitions: ключ поля та назви трьома мовами. */
public record DocumentTypeFieldDefinition(
    String key, String nameUk, String nameEn, String nameRu) {}
