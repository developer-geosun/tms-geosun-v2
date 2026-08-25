CREATE TABLE route_country_distances (
    id CHAR(36) NOT NULL,
    route_id CHAR(36) NOT NULL,
    country_code VARCHAR(8) NOT NULL,
    distance_m BIGINT NOT NULL,
    duration_s BIGINT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_route_country_distances_route_country (route_id, country_code),
    KEY idx_route_country_distances_route (route_id),
    CONSTRAINT fk_route_country_distances_route
        FOREIGN KEY (route_id) REFERENCES routes (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE route_geometry_cache (
    cache_key CHAR(64) NOT NULL,
    response_json LONGTEXT NOT NULL,
    expires_at DATETIME(6) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (cache_key),
    KEY idx_route_geometry_cache_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
