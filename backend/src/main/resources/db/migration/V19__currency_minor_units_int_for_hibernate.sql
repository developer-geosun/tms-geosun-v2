-- Hibernate при ddl-auto=validate очікує INTEGER для int minorUnits, а V16 створив TINYINT — узгоджуємо тип.

ALTER TABLE currencies MODIFY COLUMN minor_units INT NOT NULL DEFAULT 2;
