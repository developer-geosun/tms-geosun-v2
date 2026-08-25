CREATE TABLE freight_cost_calculations (
    id VARCHAR(36) NOT NULL,
    route_request_id BIGINT NOT NULL,
    scenario_id VARCHAR(36) NOT NULL,
    calculation_date DATE NOT NULL,
    breakdown_json JSON NOT NULL,
    calculation_summary TEXT NOT NULL,
    scenario_snapshot_json JSON NOT NULL,
    toll_tariff_set_snapshot_json JSON NOT NULL,
    nbu_rates_snapshot_json JSON NOT NULL,
    season_used VARCHAR(32) NOT NULL,
    l_total_km DECIMAL(12, 3) NOT NULL,
    l_empty_km DECIMAL(12, 3) NOT NULL,
    l_loaded_km DECIMAL(12, 3) NOT NULL,
    direct_cost_uah DECIMAL(14, 2) NOT NULL,
    driver_cost_uah DECIMAL(14, 2) NOT NULL,
    cost_before_margin_uah DECIMAL(14, 2) NOT NULL,
    margin_uah DECIMAL(14, 2) NOT NULL,
    total_uah DECIMAL(14, 2) NOT NULL,
    total_proposal_amount DECIMAL(14, 2) NOT NULL,
    proposal_currency CHAR(3) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    created_by_user_id VARCHAR(36) NOT NULL,
    PRIMARY KEY (id),
    KEY idx_freight_cost_calc_request_created (route_request_id, created_at),
    KEY idx_freight_cost_calc_scenario (scenario_id),
    CONSTRAINT fk_freight_cost_calc_request
        FOREIGN KEY (route_request_id) REFERENCES route_requests (id) ON DELETE CASCADE,
    CONSTRAINT fk_freight_cost_calc_scenario
        FOREIGN KEY (scenario_id) REFERENCES freight_numeric_scenarios (id) ON DELETE RESTRICT,
    CONSTRAINT fk_freight_cost_calc_created_by
        FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE route_requests
    ADD COLUMN nbu_breakdown_scenario_id VARCHAR(36) NULL AFTER comment,
    ADD COLUMN nbu_breakdown_at DATETIME(6) NULL AFTER nbu_breakdown_scenario_id;

ALTER TABLE freight_quotes
    ADD COLUMN freight_cost_calculation_id VARCHAR(36) NULL AFTER internal_note,
    ADD CONSTRAINT fk_freight_quotes_cost_calculation
        FOREIGN KEY (freight_cost_calculation_id) REFERENCES freight_cost_calculations (id) ON DELETE SET NULL;
