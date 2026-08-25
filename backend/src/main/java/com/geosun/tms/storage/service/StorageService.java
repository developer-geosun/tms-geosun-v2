package com.geosun.tms.storage.service;

import java.io.InputStream;
import org.springframework.core.io.Resource;

/**
 * Низькорівневе сховище байтів за логічним {@code storageKey} (диск або S3).
 */
public interface StorageService {

  /** Тип реалізації: {@code local} або {@code s3}. */
  String type();

  void put(String storageKey, InputStream content, long contentLength, String contentType);

  Resource open(String storageKey);

  /** Ідемпотентно: відсутній об'єкт не є помилкою. */
  void delete(String storageKey);
}
