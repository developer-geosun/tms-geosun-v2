-- Довідник видів документів (admin-only CRUD, м'яке видалення).
CREATE TABLE document_types (
    id VARCHAR(36) NOT NULL,
    name_uk VARCHAR(128) NOT NULL,
    name_en VARCHAR(128) NOT NULL,
    name_ru VARCHAR(128) NOT NULL,
    country_code VARCHAR(2) NOT NULL,
    planned_scan_pages INT NOT NULL DEFAULT 0,
    field_definitions JSON NOT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    KEY idx_document_types_deleted_country_name (is_deleted, country_code, name_uk),
    CONSTRAINT fk_document_types_country
        FOREIGN KEY (country_code) REFERENCES country_reference (code_alpha2)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
