-- Ідемпотентне додавання колонки persistent у таблицю refresh_tokens (MySQL 8 не підтримує ADD COLUMN IF NOT EXISTS).
SET @col_exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'refresh_tokens'
      AND COLUMN_NAME = 'persistent'
);

SET @ddl_add := IF(
    @col_exists = 0,
    'ALTER TABLE refresh_tokens ADD COLUMN persistent TINYINT(1) NOT NULL DEFAULT 0',
    'SELECT 1'
);
PREPARE stmt_add FROM @ddl_add;
EXECUTE stmt_add;
DEALLOCATE PREPARE stmt_add;
