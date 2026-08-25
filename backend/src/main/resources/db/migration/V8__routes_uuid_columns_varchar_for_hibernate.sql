ALTER TABLE quote_idempotency_keys
    DROP FOREIGN KEY fk_quote_idempotency_request;

ALTER TABLE freight_quotes
    DROP FOREIGN KEY fk_freight_quotes_request;

ALTER TABLE route_country_distances
    DROP FOREIGN KEY fk_route_country_distances_route;

ALTER TABLE request_status_history
    DROP FOREIGN KEY fk_request_status_history_request,
    DROP FOREIGN KEY fk_request_status_history_user;

ALTER TABLE route_requests
    DROP FOREIGN KEY fk_route_requests_user,
    DROP FOREIGN KEY fk_route_requests_route;

ALTER TABLE route_points
    DROP FOREIGN KEY fk_route_points_route;

ALTER TABLE routes
    DROP FOREIGN KEY fk_routes_user;

ALTER TABLE routes
    MODIFY COLUMN id VARCHAR(36) NOT NULL,
    MODIFY COLUMN user_id VARCHAR(36) NOT NULL;

ALTER TABLE route_points
    MODIFY COLUMN id VARCHAR(36) NOT NULL,
    MODIFY COLUMN route_id VARCHAR(36) NOT NULL;

ALTER TABLE route_requests
    MODIFY COLUMN id VARCHAR(36) NOT NULL,
    MODIFY COLUMN user_id VARCHAR(36) NOT NULL,
    MODIFY COLUMN route_id VARCHAR(36) NOT NULL;

ALTER TABLE request_status_history
    MODIFY COLUMN id VARCHAR(36) NOT NULL,
    MODIFY COLUMN request_id VARCHAR(36) NOT NULL,
    MODIFY COLUMN changed_by VARCHAR(36) NULL;

ALTER TABLE route_country_distances
    MODIFY COLUMN id VARCHAR(36) NOT NULL,
    MODIFY COLUMN route_id VARCHAR(36) NOT NULL;

ALTER TABLE route_geometry_cache
    MODIFY COLUMN cache_key VARCHAR(64) NOT NULL;

ALTER TABLE routes
    ADD CONSTRAINT fk_routes_user
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;

ALTER TABLE route_points
    ADD CONSTRAINT fk_route_points_route
        FOREIGN KEY (route_id) REFERENCES routes (id) ON DELETE CASCADE;

ALTER TABLE route_requests
    ADD CONSTRAINT fk_route_requests_user
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_route_requests_route
        FOREIGN KEY (route_id) REFERENCES routes (id) ON DELETE RESTRICT;

ALTER TABLE request_status_history
    ADD CONSTRAINT fk_request_status_history_request
        FOREIGN KEY (request_id) REFERENCES route_requests (id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_request_status_history_user
        FOREIGN KEY (changed_by) REFERENCES users (id) ON DELETE SET NULL;

ALTER TABLE route_country_distances
    ADD CONSTRAINT fk_route_country_distances_route
        FOREIGN KEY (route_id) REFERENCES routes (id) ON DELETE CASCADE;

ALTER TABLE freight_quotes
    ADD CONSTRAINT fk_freight_quotes_request
        FOREIGN KEY (request_id) REFERENCES route_requests (id) ON DELETE CASCADE;

ALTER TABLE quote_idempotency_keys
    ADD CONSTRAINT fk_quote_idempotency_request
        FOREIGN KEY (request_id) REFERENCES route_requests (id) ON DELETE CASCADE;
