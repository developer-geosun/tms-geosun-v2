-- Hibernate при ddl-auto=validate очікує VARCHAR для String з length, а V21/V22 створили CHAR — узгоджуємо типи.

ALTER TABLE country_toll_rules MODIFY COLUMN country_code VARCHAR(2) NOT NULL;
ALTER TABLE freight_numeric_scenarios MODIFY COLUMN proposal_currency VARCHAR(3) NOT NULL;
ALTER TABLE freight_cost_calculations MODIFY COLUMN proposal_currency VARCHAR(3) NOT NULL;
