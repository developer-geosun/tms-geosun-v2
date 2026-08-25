-- Hibernate при ddl-auto=validate очікує VARCHAR(2/3) для String code, а V20 створив CHAR(2/3) — узгоджуємо типи.

ALTER TABLE country_reference MODIFY COLUMN code_alpha2 VARCHAR(2) NOT NULL;
ALTER TABLE country_reference MODIFY COLUMN code_alpha3 VARCHAR(3) NOT NULL;
