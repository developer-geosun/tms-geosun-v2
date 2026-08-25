package com.geosun.tms.storage.dto;

import java.time.Instant;

/** Метадані збереженого файлу (без байтів). */
public record StoredFileDto(
    String id,
    String storageKey,
    String originalFilename,
    String contentType,
    long sizeBytes,
    Instant createdAt,
    String createdByUserId) {}
