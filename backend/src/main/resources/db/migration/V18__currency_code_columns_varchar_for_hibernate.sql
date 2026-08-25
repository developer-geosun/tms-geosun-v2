-- Hibernate при ddl-auto=validate очікує VARCHAR(3) для String code, а V16/V17 створили CHAR(3) — узгоджуємо типи.

SET @OLD_FOREIGN_KEY_CHECKS = @@FOREIGN_KEY_CHECKS;
SET FOREIGN_KEY_CHECKS = 0;

ALTER TABLE currencies MODIFY COLUMN code VARCHAR(3) NOT NULL;
ALTER TABLE currency_nbu_rates MODIFY COLUMN currency_code VARCHAR(3) NOT NULL;
ALTER TABLE currency_nbu_rates MODIFY COLUMN special VARCHAR(1) NULL;

SET FOREIGN_KEY_CHECKS = @OLD_FOREIGN_KEY_CHECKS;
