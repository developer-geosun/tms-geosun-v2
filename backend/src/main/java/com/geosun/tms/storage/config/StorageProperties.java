package com.geosun.tms.storage.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Параметри сховища файлів: {@code app.storage.type=local|s3} та вкладені секції.
 */
@ConfigurationProperties(prefix = "app.storage")
public class StorageProperties {

  /** {@code local} або {@code s3}. */
  private String type = "local";

  private final Local local = new Local();
  private final S3 s3 = new S3();

  public String getType() {
    return type;
  }

  public void setType(String type) {
    this.type = type;
  }

  public Local getLocal() {
    return local;
  }

  public S3 getS3() {
    return s3;
  }

  public static class Local {
    private String basePath = "./data/uploads";

    public String getBasePath() {
      return basePath;
    }

    public void setBasePath(String basePath) {
      this.basePath = basePath;
    }
  }

  public static class S3 {
    private String endpoint = "";
    private String region = "us-east-1";
    private String bucket = "tms-uploads";
    private String accessKey = "";
    private String secretKey = "";
    private boolean pathStyleAccess = true;

    public String getEndpoint() {
      return endpoint;
    }

    public void setEndpoint(String endpoint) {
      this.endpoint = endpoint;
    }

    public String getRegion() {
      return region;
    }

    public void setRegion(String region) {
      this.region = region;
    }

    public String getBucket() {
      return bucket;
    }

    public void setBucket(String bucket) {
      this.bucket = bucket;
    }

    public String getAccessKey() {
      return accessKey;
    }

    public void setAccessKey(String accessKey) {
      this.accessKey = accessKey;
    }

    public String getSecretKey() {
      return secretKey;
    }

    public void setSecretKey(String secretKey) {
      this.secretKey = secretKey;
    }

    public boolean isPathStyleAccess() {
      return pathStyleAccess;
    }

    public void setPathStyleAccess(boolean pathStyleAccess) {
      this.pathStyleAccess = pathStyleAccess;
    }
  }
}
