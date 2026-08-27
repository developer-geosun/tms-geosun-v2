package com.geosun.tms.reference.config;

import com.geosun.tms.reference.service.ActiveTripGuard;
import com.geosun.tms.reference.service.NoOpActiveTripGuard;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ReferenceActiveTripGuardConfig {

  @Bean
  @ConditionalOnMissingBean(ActiveTripGuard.class)
  public ActiveTripGuard noOpActiveTripGuard() {
    return new NoOpActiveTripGuard();
  }
}
