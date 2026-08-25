CREATE TABLE freight_calculation_scenarios (
    id CHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    rules_text TEXT NOT NULL,
    output_format_hint VARCHAR(64) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    created_by_user_id CHAR(36) NOT NULL,
    updated_by_user_id CHAR(36) NOT NULL,
    PRIMARY KEY (id),
    KEY idx_freight_scenarios_active_name (is_active, name),
    CONSTRAINT fk_freight_scenarios_created_by
        FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT fk_freight_scenarios_updated_by
        FOREIGN KEY (updated_by_user_id) REFERENCES users (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE freight_ai_calculations (
    id CHAR(36) NOT NULL,
    route_request_id BIGINT NOT NULL,
    scenario_id CHAR(36) NULL,
    scenario_rules_snapshot TEXT NULL,
    model_id VARCHAR(128) NULL,
    prompt_payload JSON NULL,
    response_text LONGTEXT NULL,
    response_structured JSON NULL,
    status VARCHAR(32) NOT NULL,
    error_message TEXT NULL,
    latency_ms INT NULL,
    created_at DATETIME(6) NOT NULL,
    created_by_user_id CHAR(36) NOT NULL,
    PRIMARY KEY (id),
    KEY idx_freight_ai_calc_request_created (route_request_id, created_at),
    KEY idx_freight_ai_calc_scenario (scenario_id),
    CONSTRAINT fk_freight_ai_calc_request
        FOREIGN KEY (route_request_id) REFERENCES route_requests (id) ON DELETE CASCADE,
    CONSTRAINT fk_freight_ai_calc_scenario
        FOREIGN KEY (scenario_id) REFERENCES freight_calculation_scenarios (id) ON DELETE SET NULL,
    CONSTRAINT fk_freight_ai_calc_created_by
        FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
