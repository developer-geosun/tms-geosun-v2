-- Загальне сховище метаданих файлів (байти — на диску або в S3/MinIO).
CREATE TABLE stored_files (
    id VARCHAR(36) NOT NULL,
    storage_key VARCHAR(512) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    content_type VARCHAR(128) NOT NULL,
    size_bytes BIGINT NOT NULL,
    created_at DATETIME(6) NOT NULL,
    created_by_user_id VARCHAR(36) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_stored_files_storage_key (storage_key),
    KEY idx_stored_files_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
