CREATE TABLE toll_tariff_sets (
    id VARCHAR(36) NOT NULL,
    name VARCHAR(128) NOT NULL,
    description TEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    created_by_user_id VARCHAR(36) NOT NULL,
    updated_by_user_id VARCHAR(36) NOT NULL,
    PRIMARY KEY (id),
    KEY idx_toll_tariff_sets_active_name (is_active, name),
    CONSTRAINT fk_toll_tariff_sets_created_by
        FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT fk_toll_tariff_sets_updated_by
        FOREIGN KEY (updated_by_user_id) REFERENCES users (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE country_toll_rules (
    id VARCHAR(36) NOT NULL,
    toll_tariff_set_id VARCHAR(36) NOT NULL,
    country_code CHAR(2) NOT NULL,
    toll_type VARCHAR(32) NOT NULL,
    rate DECIMAL(12, 4) NOT NULL,
    fixed_days INT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_country_toll_rules_set_country (toll_tariff_set_id, country_code),
    KEY idx_country_toll_rules_set (toll_tariff_set_id),
    CONSTRAINT fk_country_toll_rules_set
        FOREIGN KEY (toll_tariff_set_id) REFERENCES toll_tariff_sets (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE freight_numeric_scenarios (
    id VARCHAR(36) NOT NULL,
    name VARCHAR(128) NOT NULL,
    description TEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    fuel_consumption_empty_l_per_100km DECIMAL(8, 2) NOT NULL,
    fuel_consumption_loaded_non_winter_l_per_100km DECIMAL(8, 2) NOT NULL,
    fuel_consumption_loaded_winter_l_per_100km DECIMAL(8, 2) NOT NULL,
    season_mode VARCHAR(32) NOT NULL,
    fuel_price_per_liter DECIMAL(12, 4) NOT NULL,
    driver_salary_percent_of_freight DECIMAL(8, 4) NOT NULL,
    per_diem_amount_per_day DECIMAL(12, 4) NOT NULL,
    per_diem_route_divisor_km INT NOT NULL DEFAULT 600,
    per_diem_fixed_extra_days INT NOT NULL DEFAULT 2,
    margin_type VARCHAR(64) NOT NULL,
    margin_percent DECIMAL(8, 4) NULL,
    margin_fixed_amount DECIMAL(14, 2) NULL,
    proposal_currency CHAR(3) NOT NULL,
    toll_tariff_set_id VARCHAR(36) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    created_by_user_id VARCHAR(36) NOT NULL,
    updated_by_user_id VARCHAR(36) NOT NULL,
    PRIMARY KEY (id),
    KEY idx_freight_numeric_scenarios_active_name (is_active, name),
    CONSTRAINT fk_freight_numeric_scenarios_toll_set
        FOREIGN KEY (toll_tariff_set_id) REFERENCES toll_tariff_sets (id) ON DELETE RESTRICT,
    CONSTRAINT fk_freight_numeric_scenarios_created_by
        FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT fk_freight_numeric_scenarios_updated_by
        FOREIGN KEY (updated_by_user_id) REFERENCES users (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
