-- Hibernate при ddl-auto=validate очікує VARCHAR(36) для String id, а V14 створив CHAR(36) — узгоджуємо типи.

ALTER TABLE freight_ai_calculations
    DROP FOREIGN KEY fk_freight_ai_calc_request,
    DROP FOREIGN KEY fk_freight_ai_calc_scenario,
    DROP FOREIGN KEY fk_freight_ai_calc_created_by;

ALTER TABLE freight_calculation_scenarios
    DROP FOREIGN KEY fk_freight_scenarios_created_by,
    DROP FOREIGN KEY fk_freight_scenarios_updated_by;

ALTER TABLE freight_calculation_scenarios
    MODIFY COLUMN id VARCHAR(36) NOT NULL,
    MODIFY COLUMN created_by_user_id VARCHAR(36) NOT NULL,
    MODIFY COLUMN updated_by_user_id VARCHAR(36) NOT NULL;

ALTER TABLE freight_ai_calculations
    MODIFY COLUMN id VARCHAR(36) NOT NULL,
    MODIFY COLUMN scenario_id VARCHAR(36) NULL,
    MODIFY COLUMN created_by_user_id VARCHAR(36) NOT NULL;

ALTER TABLE freight_calculation_scenarios
    ADD CONSTRAINT fk_freight_scenarios_created_by
        FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_freight_scenarios_updated_by
        FOREIGN KEY (updated_by_user_id) REFERENCES users (id) ON DELETE RESTRICT;

ALTER TABLE freight_ai_calculations
    ADD CONSTRAINT fk_freight_ai_calc_request
        FOREIGN KEY (route_request_id) REFERENCES route_requests (id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_freight_ai_calc_scenario
        FOREIGN KEY (scenario_id) REFERENCES freight_calculation_scenarios (id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_freight_ai_calc_created_by
        FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON DELETE RESTRICT;
