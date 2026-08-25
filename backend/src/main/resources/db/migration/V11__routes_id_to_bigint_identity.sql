ALTER TABLE route_points
    DROP FOREIGN KEY fk_route_points_route;

ALTER TABLE route_requests
    DROP FOREIGN KEY fk_route_requests_route;

ALTER TABLE route_country_distances
    DROP FOREIGN KEY fk_route_country_distances_route;

ALTER TABLE routes
    ADD COLUMN id_new BIGINT NOT NULL AUTO_INCREMENT,
    ADD UNIQUE KEY uk_routes_id_new (id_new);

ALTER TABLE route_points
    ADD COLUMN route_id_new BIGINT NULL;

ALTER TABLE route_requests
    ADD COLUMN route_id_new BIGINT NULL;

ALTER TABLE route_country_distances
    ADD COLUMN route_id_new BIGINT NULL;

UPDATE route_points rp
JOIN routes r ON r.id = rp.route_id
SET rp.route_id_new = r.id_new;

UPDATE route_requests rr
JOIN routes r ON r.id = rr.route_id
SET rr.route_id_new = r.id_new;

UPDATE route_country_distances rcd
JOIN routes r ON r.id = rcd.route_id
SET rcd.route_id_new = r.id_new;

ALTER TABLE route_points
    MODIFY COLUMN route_id_new BIGINT NOT NULL;

ALTER TABLE route_requests
    MODIFY COLUMN route_id_new BIGINT NOT NULL;

ALTER TABLE route_country_distances
    MODIFY COLUMN route_id_new BIGINT NOT NULL;

ALTER TABLE route_points
    DROP INDEX uk_route_points_route_order,
    DROP INDEX idx_route_points_route_order,
    DROP COLUMN route_id;

ALTER TABLE route_requests
    DROP INDEX idx_route_requests_route_id,
    DROP COLUMN route_id;

ALTER TABLE route_country_distances
    DROP INDEX uk_route_country_distances_route_country,
    DROP INDEX idx_route_country_distances_route,
    DROP COLUMN route_id;

ALTER TABLE routes
    DROP PRIMARY KEY,
    DROP COLUMN id,
    CHANGE COLUMN id_new id BIGINT NOT NULL AUTO_INCREMENT,
    ADD PRIMARY KEY (id);

ALTER TABLE routes
    DROP INDEX uk_routes_id_new;

ALTER TABLE route_points
    CHANGE COLUMN route_id_new route_id BIGINT NOT NULL,
    ADD UNIQUE KEY uk_route_points_route_order (route_id, point_order),
    ADD KEY idx_route_points_route_order (route_id, point_order),
    ADD CONSTRAINT fk_route_points_route
        FOREIGN KEY (route_id) REFERENCES routes (id) ON DELETE CASCADE;

ALTER TABLE route_requests
    CHANGE COLUMN route_id_new route_id BIGINT NOT NULL,
    ADD KEY idx_route_requests_route_id (route_id),
    ADD CONSTRAINT fk_route_requests_route
        FOREIGN KEY (route_id) REFERENCES routes (id) ON DELETE RESTRICT;

ALTER TABLE route_country_distances
    CHANGE COLUMN route_id_new route_id BIGINT NOT NULL,
    ADD UNIQUE KEY uk_route_country_distances_route_country (route_id, country_code),
    ADD KEY idx_route_country_distances_route (route_id),
    ADD CONSTRAINT fk_route_country_distances_route
        FOREIGN KEY (route_id) REFERENCES routes (id) ON DELETE CASCADE;
