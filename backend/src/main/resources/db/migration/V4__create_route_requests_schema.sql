CREATE TABLE route_requests (
    id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    route_id CHAR(36) NOT NULL,
    status VARCHAR(32) NOT NULL,
    cargo_type VARCHAR(64) NULL,
    weight_kg DECIMAL(12,3) NULL,
    volume_m3 DECIMAL(12,3) NULL,
    preferred_start_date DATE NULL,
    comment TEXT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    KEY idx_route_requests_status_created_at (status, created_at),
    KEY idx_route_requests_user_created_at (user_id, created_at),
    KEY idx_route_requests_route_id (route_id),
    CONSTRAINT fk_route_requests_user
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_route_requests_route
        FOREIGN KEY (route_id) REFERENCES routes (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE request_status_history (
    id CHAR(36) NOT NULL,
    request_id CHAR(36) NOT NULL,
    from_status VARCHAR(32) NULL,
    to_status VARCHAR(32) NOT NULL,
    changed_by CHAR(36) NULL,
    changed_at DATETIME(6) NOT NULL,
    note VARCHAR(500) NULL,
    PRIMARY KEY (id),
    KEY idx_request_status_history_request_changed_at (request_id, changed_at),
    CONSTRAINT fk_request_status_history_request
        FOREIGN KEY (request_id) REFERENCES route_requests (id) ON DELETE CASCADE,
    CONSTRAINT fk_request_status_history_user
        FOREIGN KEY (changed_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

