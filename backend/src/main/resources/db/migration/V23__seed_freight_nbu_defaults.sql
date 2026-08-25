-- Seed v1: набір тарифів EU default (якщо є admin) + дефолтний числовий сценарій
SET @seed_admin_id = (
    SELECT id FROM users WHERE role = 'ADMIN' AND is_deleted = 0 ORDER BY created_at LIMIT 1
);

SET @toll_set_id = 'a1000000-0000-4000-8000-000000000001';
SET @scenario_id = 'a1000000-0000-4000-8000-000000000002';
SET @now = CURRENT_TIMESTAMP(6);

INSERT INTO toll_tariff_sets (
    id, name, description, is_active, created_at, updated_at, created_by_user_id, updated_by_user_id
)
SELECT
    @toll_set_id,
    'EU default',
    'Еталонні ставки v1 (PL, DE, CZ, SK, AT, HU, RO)',
    TRUE,
    @now,
    @now,
    @seed_admin_id,
    @seed_admin_id
WHERE @seed_admin_id IS NOT NULL;

INSERT INTO country_toll_rules (
    id, toll_tariff_set_id, country_code, toll_type, rate, fixed_days, is_active, created_at, updated_at
)
SELECT id, set_id, cc, tt, r, fd, ia, ca, ua FROM (
    SELECT 'b1000000-0000-4000-8000-000000000011' AS id, @toll_set_id AS set_id, 'PL' AS cc, 'EUR_PER_KM' AS tt, 0.1200 AS r, NULL AS fd, TRUE AS ia, @now AS ca, @now AS ua
    UNION ALL SELECT 'b1000000-0000-4000-8000-000000000012', @toll_set_id, 'DE', 'EUR_PER_KM', 0.1500, NULL, TRUE, @now, @now
    UNION ALL SELECT 'b1000000-0000-4000-8000-000000000013', @toll_set_id, 'CZ', 'EUR_PER_KM', 0.1000, NULL, TRUE, @now, @now
    UNION ALL SELECT 'b1000000-0000-4000-8000-000000000014', @toll_set_id, 'SK', 'EUR_PER_KM', 0.0900, NULL, TRUE, @now, @now
    UNION ALL SELECT 'b1000000-0000-4000-8000-000000000015', @toll_set_id, 'AT', 'EUR_PER_DAY', 8.0000, 2, TRUE, @now, @now
    UNION ALL SELECT 'b1000000-0000-4000-8000-000000000016', @toll_set_id, 'HU', 'EUR_PER_KM', 0.1100, NULL, TRUE, @now, @now
    UNION ALL SELECT 'b1000000-0000-4000-8000-000000000017', @toll_set_id, 'RO', 'EUR_PER_KM', 0.0800, NULL, TRUE, @now, @now
) AS seed_rules
WHERE @seed_admin_id IS NOT NULL;

INSERT INTO freight_numeric_scenarios (
    id, name, description, is_active,
    fuel_consumption_empty_l_per_100km,
    fuel_consumption_loaded_non_winter_l_per_100km,
    fuel_consumption_loaded_winter_l_per_100km,
    season_mode, fuel_price_per_liter, driver_salary_percent_of_freight,
    per_diem_amount_per_day, per_diem_route_divisor_km, per_diem_fixed_extra_days,
    margin_type, margin_percent, margin_fixed_amount, proposal_currency, toll_tariff_set_id,
    created_at, updated_at, created_by_user_id, updated_by_user_id
)
SELECT
    @scenario_id,
    'UA8150 margin30 v1',
    'Еталон: 81.50 UAH/л, маржа 30%, ЗП 15%, суточні 10 EUR',
    TRUE,
    35.00, 38.00, 40.00,
    'AUTO', 81.5000, 15.0000,
    10.0000, 600, 2,
    'PERCENT_OF_COST_BEFORE_MARGIN', 30.0000, NULL, 'EUR', @toll_set_id,
    @now, @now, @seed_admin_id, @seed_admin_id
WHERE @seed_admin_id IS NOT NULL;
