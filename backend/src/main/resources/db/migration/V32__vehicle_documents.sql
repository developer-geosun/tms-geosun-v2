-- Прапор рефрижератора та історія документів ТС (дати + скан).
ALTER TABLE vehicles
    ADD COLUMN has_refrigerator BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE vehicle_documents (
    id VARCHAR(36) NOT NULL,
    vehicle_id VARCHAR(36) NOT NULL,
    document_type VARCHAR(64) NOT NULL,
    valid_from DATE NOT NULL,
    valid_to DATE NOT NULL,
    stored_file_id VARCHAR(36) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    KEY idx_vehicle_documents_vehicle_type_created (vehicle_id, document_type, created_at),
    CONSTRAINT fk_vehicle_documents_vehicle
        FOREIGN KEY (vehicle_id) REFERENCES vehicles (id),
    CONSTRAINT fk_vehicle_documents_stored_file
        FOREIGN KEY (stored_file_id) REFERENCES stored_files (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
