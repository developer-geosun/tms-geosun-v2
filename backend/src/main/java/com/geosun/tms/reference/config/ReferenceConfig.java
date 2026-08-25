package com.geosun.tms.reference.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(NbuExchangeRateProperties.class)
public class ReferenceConfig {}
