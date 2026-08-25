package com.geosun.tms.storage.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.geosun.tms.auth.exception.ApiException;
import com.geosun.tms.storage.config.StorageProperties;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.core.io.Resource;

class LocalDiskStorageServiceTest {

  @TempDir Path tempDir;

  private LocalDiskStorageService storage;

  @BeforeEach
  void setUp() {
    StorageProperties properties = new StorageProperties();
    properties.setType("local");
    properties.getLocal().setBasePath(tempDir.toString());
    storage = new LocalDiskStorageService(properties);
  }

  @Test
  void putOpenDelete_roundTrip() throws Exception {
    byte[] payload = "hello-storage".getBytes(StandardCharsets.UTF_8);
    String key = "admin-test/" + java.util.UUID.randomUUID() + ".txt";

    storage.put(key, new ByteArrayInputStream(payload), payload.length, "text/plain");

    Resource resource = storage.open(key);
    assertThat(resource.getContentAsByteArray()).isEqualTo(payload);
    assertThat(Files.exists(tempDir.resolve(key))).isTrue();

    storage.delete(key);
    assertThat(Files.exists(tempDir.resolve(key))).isFalse();
    storage.delete(key); // ідемпотентно
  }

  @Test
  void resolveSafe_rejectsPathTraversal() {
    assertThatThrownBy(() -> storage.open("../secret.txt"))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getCode())
        .isEqualTo("VALIDATION_ERROR");
  }

  @Test
  void open_missingFile_notFound() {
    assertThatThrownBy(() -> storage.open("admin-test/missing.bin"))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).getStatus())
        .isEqualTo(404);
  }
}
