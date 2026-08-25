package com.geosun.tms.storage.config;

import com.geosun.tms.storage.service.LocalDiskStorageService;
import com.geosun.tms.storage.service.S3StorageService;
import com.geosun.tms.storage.service.StorageService;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Реєстрація одного {@link StorageService} залежно від {@code app.storage.type}.
 */
@Configuration
@EnableConfigurationProperties(StorageProperties.class)
public class StorageConfig {

  @Bean
  public StorageService storageService(StorageProperties properties) {
    String type = properties.getType() == null ? "" : properties.getType().trim().toLowerCase();
    return switch (type) {
      case "local" -> new LocalDiskStorageService(properties);
      case "s3" -> new S3StorageService(properties);
      default ->
          throw new IllegalStateException(
              "Unsupported app.storage.type='"
                  + properties.getType()
                  + "'. Expected 'local' or 's3'.");
    };
  }
}
