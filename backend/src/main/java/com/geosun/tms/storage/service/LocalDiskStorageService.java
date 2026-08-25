package com.geosun.tms.storage.service;

import com.geosun.tms.auth.exception.ApiException;
import com.geosun.tms.storage.config.StorageProperties;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Objects;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.lang.NonNull;

/**
 * Збереження файлів на локальному диску під {@code app.storage.local.base-path}.
 */
public class LocalDiskStorageService implements StorageService {

  private final Path basePath;

  public LocalDiskStorageService(@NonNull StorageProperties properties) {
    String configured = properties.getLocal().getBasePath();
    if (configured == null || configured.isBlank()) {
      throw new IllegalStateException("app.storage.local.base-path must be set");
    }
    try {
      this.basePath = Path.of(configured).toAbsolutePath().normalize();
      Files.createDirectories(this.basePath);
    } catch (IOException ex) {
      throw new IllegalStateException("Cannot create storage base path: " + configured, ex);
    }
  }

  @Override
  public String type() {
    return "local";
  }

  @Override
  public void put(String storageKey, InputStream content, long contentLength, String contentType) {
    Path target = resolveSafe(storageKey);
    try {
      Path parent = target.getParent();
      if (parent != null) {
        Files.createDirectories(parent);
      }
      Files.copy(content, target, StandardCopyOption.REPLACE_EXISTING);
    } catch (IOException ex) {
      throw ApiException.unprocessableEntity(
          "STORAGE_WRITE_FAILED", "Failed to write file to local storage");
    }
  }

  @Override
  public Resource open(String storageKey) {
    Path target = resolveSafe(storageKey);
    if (!Files.isRegularFile(target)) {
      throw ApiException.notFound("Stored file not found on disk");
    }
    try {
      Resource resource = new UrlResource(Objects.requireNonNull(target.toUri()));
      if (!resource.exists() || !resource.isReadable()) {
        throw ApiException.notFound("Stored file not readable");
      }
      return resource;
    } catch (IOException ex) {
      throw ApiException.unprocessableEntity(
          "STORAGE_READ_FAILED", "Failed to open file from local storage");
    }
  }

  @Override
  public void delete(String storageKey) {
    Path target = resolveSafe(storageKey);
    try {
      Files.deleteIfExists(target);
    } catch (IOException ex) {
      throw ApiException.unprocessableEntity(
          "STORAGE_DELETE_FAILED", "Failed to delete file from local storage");
    }
  }

  Path resolveSafe(String storageKey) {
    if (storageKey == null || storageKey.isBlank()) {
      throw ApiException.badRequest("VALIDATION_ERROR", "storageKey is required");
    }
    if (storageKey.contains("..") || storageKey.startsWith("/") || storageKey.startsWith("\\")) {
      throw ApiException.badRequest("VALIDATION_ERROR", "Invalid storageKey");
    }
    Path resolved = basePath.resolve(storageKey).normalize();
    if (!resolved.startsWith(basePath)) {
      throw ApiException.badRequest("VALIDATION_ERROR", "Invalid storageKey path");
    }
    return resolved;
  }
}
