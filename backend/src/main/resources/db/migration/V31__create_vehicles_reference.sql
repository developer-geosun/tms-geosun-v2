-- Довідник транспортних засобів та скани свідоцтва про реєстрацію.
CREATE TABLE vehicles (
    id VARCHAR(36) NOT NULL,
    plate_number VARCHAR(32) NOT NULL,
    vin VARCHAR(17) NOT NULL,
    make VARCHAR(64) NOT NULL,
    model VARCHAR(64) NOT NULL,
    manufacture_year SMALLINT NOT NULL,
    owner VARCHAR(255) NOT NULL,
    registration_series VARCHAR(16) NOT NULL,
    registration_number VARCHAR(32) NOT NULL,
    vehicle_type VARCHAR(32) NOT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    KEY idx_vehicles_deleted_plate (is_deleted, plate_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE vehicle_registration_scans (
    id VARCHAR(36) NOT NULL,
    vehicle_id VARCHAR(36) NOT NULL,
    side VARCHAR(16) NOT NULL,
    stored_file_id VARCHAR(36) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_vehicle_registration_scans_vehicle_side (vehicle_id, side),
    CONSTRAINT fk_vehicle_registration_scans_vehicle
        FOREIGN KEY (vehicle_id) REFERENCES vehicles (id),
    CONSTRAINT fk_vehicle_registration_scans_stored_file
        FOREIGN KEY (stored_file_id) REFERENCES stored_files (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
