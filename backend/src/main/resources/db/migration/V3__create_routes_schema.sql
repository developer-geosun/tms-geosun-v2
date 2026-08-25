CREATE TABLE routes (
    id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    routing_profile VARCHAR(64) NOT NULL,
    routing_mode VARCHAR(64) NOT NULL,
    route_polyline LONGTEXT NOT NULL,
    distance_km DECIMAL(12,3) NULL,
    duration_min INT NULL,
    route_comment TEXT NULL,
    is_deleted TINYINT(1) NOT NULL DEFAULT 0,
    deleted_at DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    last_opened_at DATETIME(6) NULL,
    PRIMARY KEY (id),
    KEY idx_routes_user_updated_at (user_id, updated_at),
    CONSTRAINT fk_routes_user
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE route_points (
    id CHAR(36) NOT NULL,
    route_id CHAR(36) NOT NULL,
    point_order INT NOT NULL,
    point_type VARCHAR(16) NOT NULL,
    address VARCHAR(500) NOT NULL,
    lat DECIMAL(10,7) NOT NULL,
    lng DECIMAL(10,7) NOT NULL,
    country VARCHAR(8) NULL,
    is_border TINYINT(1) NOT NULL DEFAULT 0,
    segment_distance_km_to_next DECIMAL(12,3) NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_route_points_route_order (route_id, point_order),
    KEY idx_route_points_route_order (route_id, point_order),
    CONSTRAINT fk_route_points_route
        FOREIGN KEY (route_id) REFERENCES routes (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

