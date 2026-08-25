package com.geosun.tms.auth;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication(
    scanBasePackages = "com.geosun.tms",
    exclude = {UserDetailsServiceAutoConfiguration.class})
@EntityScan(basePackages = "com.geosun.tms")
@EnableJpaRepositories(basePackages = "com.geosun.tms")
public class TmsGeosunBackendJavaApplication {

  public static void main(String[] args) {
    SpringApplication.run(TmsGeosunBackendJavaApplication.class, args);
  }
}
