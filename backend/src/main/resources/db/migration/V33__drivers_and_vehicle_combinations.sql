-- Довідник водіїв та скани документів (паспорт / посвідчення).
CREATE TABLE drivers (
    id VARCHAR(36) NOT NULL,
    last_name VARCHAR(128) NOT NULL,
    first_name VARCHAR(128) NOT NULL,
    patronymic VARCHAR(128) NULL,
    phone VARCHAR(32) NOT NULL,
    license_number VARCHAR(64) NOT NULL,
    license_categories VARCHAR(64) NOT NULL,
    license_expires_on DATE NOT NULL,
    user_id VARCHAR(36) NULL,
    comment VARCHAR(1000) NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_drivers_user_id (user_id),
    KEY idx_drivers_deleted_last_name (is_deleted, last_name, first_name),
    KEY idx_drivers_license_active (is_deleted, license_number),
    CONSTRAINT fk_drivers_user
        FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE driver_documents (
    id VARCHAR(36) NOT NULL,
    driver_id VARCHAR(36) NOT NULL,
    document_type VARCHAR(64) NOT NULL,
    side VARCHAR(16) NOT NULL,
    valid_from DATE NOT NULL,
    valid_to DATE NOT NULL,
    stored_file_id VARCHAR(36) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    KEY idx_driver_documents_driver_type_side_created (driver_id, document_type, side, created_at),
    CONSTRAINT fk_driver_documents_driver
        FOREIGN KEY (driver_id) REFERENCES drivers (id),
    CONSTRAINT fk_driver_documents_stored_file
        FOREIGN KEY (stored_file_id) REFERENCES stored_files (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Іменовані автопоїзди (тягач + напівпричіп).
CREATE TABLE vehicle_combinations (
    id VARCHAR(36) NOT NULL,
    name VARCHAR(128) NULL,
    tractor_id VARCHAR(36) NOT NULL,
    trailer_id VARCHAR(36) NOT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    KEY idx_vehicle_combinations_deleted_name (is_deleted, name),
    KEY idx_vehicle_combinations_pair_active (is_deleted, tractor_id, trailer_id),
    CONSTRAINT fk_vehicle_combinations_tractor
        FOREIGN KEY (tractor_id) REFERENCES vehicles (id),
    CONSTRAINT fk_vehicle_combinations_trailer
        FOREIGN KEY (trailer_id) REFERENCES vehicles (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
