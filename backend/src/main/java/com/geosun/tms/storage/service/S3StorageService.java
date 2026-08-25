package com.geosun.tms.storage.service;

import com.geosun.tms.auth.exception.ApiException;
import com.geosun.tms.storage.config.StorageProperties;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.util.Objects;
import org.springframework.core.io.InputStreamResource;
import org.springframework.core.io.Resource;
import org.springframework.lang.NonNull;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3ClientBuilder;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;

/**
 * S3-сумісне сховище (AWS S3 або MinIO) через AWS SDK v2.
 */
public class S3StorageService implements StorageService, AutoCloseable {

  private final S3Client s3Client;
  private final String bucket;

  public S3StorageService(@NonNull StorageProperties properties) {
    StorageProperties.S3 s3 = properties.getS3();
    if (s3.getBucket() == null || s3.getBucket().isBlank()) {
      throw new IllegalStateException("app.storage.s3.bucket must be set");
    }
    if (s3.getAccessKey() == null || s3.getAccessKey().isBlank()) {
      throw new IllegalStateException("app.storage.s3.access-key must be set");
    }
    if (s3.getSecretKey() == null || s3.getSecretKey().isBlank()) {
      throw new IllegalStateException("app.storage.s3.secret-key must be set");
    }
    this.bucket = s3.getBucket();

    S3ClientBuilder builder =
        S3Client.builder()
            .region(
                Region.of(
                    s3.getRegion() == null || s3.getRegion().isBlank()
                        ? "us-east-1"
                        : s3.getRegion()))
            .credentialsProvider(
                StaticCredentialsProvider.create(
                    AwsBasicCredentials.create(s3.getAccessKey(), s3.getSecretKey())))
            .serviceConfiguration(
                S3Configuration.builder().pathStyleAccessEnabled(s3.isPathStyleAccess()).build());

    if (s3.getEndpoint() != null && !s3.getEndpoint().isBlank()) {
      builder.endpointOverride(URI.create(s3.getEndpoint()));
    }
    this.s3Client = builder.build();
  }

  /** Для тестів з підставним клієнтом. */
  S3StorageService(@NonNull S3Client s3Client, @NonNull String bucket) {
    this.s3Client = s3Client;
    this.bucket = bucket;
  }

  @Override
  public String type() {
    return "s3";
  }

  @Override
  public void put(String storageKey, InputStream content, long contentLength, String contentType) {
    validateKey(storageKey);
    try {
      PutObjectRequest.Builder req = PutObjectRequest.builder().bucket(bucket).key(storageKey);
      if (contentType != null && !contentType.isBlank()) {
        req.contentType(contentType);
      }
      RequestBody body =
          contentLength >= 0
              ? RequestBody.fromInputStream(content, contentLength)
              : RequestBody.fromBytes(content.readAllBytes());
      s3Client.putObject(req.build(), body);
    } catch (IOException | S3Exception ex) {
      throw ApiException.unprocessableEntity(
          "STORAGE_WRITE_FAILED", "Failed to write file to S3 storage");
    }
  }

  @Override
  public Resource open(String storageKey) {
    validateKey(storageKey);
    try {
      InputStream stream =
          s3Client.getObject(GetObjectRequest.builder().bucket(bucket).key(storageKey).build());
      return new InputStreamResource(Objects.requireNonNull(stream));
    } catch (NoSuchKeyException ex) {
      throw ApiException.notFound("Stored file not found in S3");
    } catch (S3Exception ex) {
      if (ex.statusCode() == 404) {
        throw ApiException.notFound("Stored file not found in S3");
      }
      throw ApiException.unprocessableEntity(
          "STORAGE_READ_FAILED", "Failed to open file from S3 storage");
    }
  }

  @Override
  public void delete(String storageKey) {
    validateKey(storageKey);
    try {
      s3Client.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(storageKey).build());
    } catch (S3Exception ex) {
      throw ApiException.unprocessableEntity(
          "STORAGE_DELETE_FAILED", "Failed to delete file from S3 storage");
    }
  }

  @Override
  public void close() {
    s3Client.close();
  }

  private static void validateKey(String storageKey) {
    if (storageKey == null || storageKey.isBlank()) {
      throw ApiException.badRequest("VALIDATION_ERROR", "storageKey is required");
    }
    if (storageKey.contains("..") || storageKey.startsWith("/")) {
      throw ApiException.badRequest("VALIDATION_ERROR", "Invalid storageKey");
    }
  }
}
