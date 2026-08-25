ALTER TABLE freight_quotes
    DROP FOREIGN KEY fk_freight_quotes_request;

ALTER TABLE quote_idempotency_keys
    DROP FOREIGN KEY fk_quote_idempotency_request;

ALTER TABLE request_status_history
    DROP FOREIGN KEY fk_request_status_history_request;

ALTER TABLE route_requests
    ADD COLUMN id_new BIGINT NOT NULL AUTO_INCREMENT,
    ADD UNIQUE KEY uk_route_requests_id_new (id_new);

ALTER TABLE freight_quotes
    ADD COLUMN request_id_new BIGINT NULL;

ALTER TABLE quote_idempotency_keys
    ADD COLUMN request_id_new BIGINT NULL;

ALTER TABLE request_status_history
    ADD COLUMN request_id_new BIGINT NULL;

UPDATE freight_quotes fq
JOIN route_requests rr ON rr.id = fq.request_id
SET fq.request_id_new = rr.id_new;

UPDATE quote_idempotency_keys qik
JOIN route_requests rr ON rr.id = qik.request_id
SET qik.request_id_new = rr.id_new
WHERE qik.request_id IS NOT NULL;

UPDATE request_status_history rsh
JOIN route_requests rr ON rr.id = rsh.request_id
SET rsh.request_id_new = rr.id_new;

ALTER TABLE freight_quotes
    DROP INDEX idx_freight_quotes_request_created_at,
    DROP COLUMN request_id;

ALTER TABLE freight_quotes
    CHANGE COLUMN request_id_new request_id BIGINT NOT NULL,
    ADD KEY idx_freight_quotes_request_created_at (request_id, created_at);

ALTER TABLE quote_idempotency_keys
    DROP INDEX idx_quote_idempotency_request,
    DROP COLUMN request_id;

ALTER TABLE quote_idempotency_keys
    CHANGE COLUMN request_id_new request_id BIGINT NULL,
    ADD KEY idx_quote_idempotency_request (request_id);

ALTER TABLE request_status_history
    DROP INDEX idx_request_status_history_request_changed_at,
    DROP COLUMN request_id;

ALTER TABLE request_status_history
    CHANGE COLUMN request_id_new request_id BIGINT NOT NULL,
    ADD KEY idx_request_status_history_request_changed_at (request_id, changed_at);

ALTER TABLE route_requests
    DROP PRIMARY KEY,
    DROP COLUMN id,
    CHANGE COLUMN id_new id BIGINT NOT NULL AUTO_INCREMENT,
    ADD PRIMARY KEY (id);

ALTER TABLE route_requests
    DROP INDEX uk_route_requests_id_new;

ALTER TABLE freight_quotes
    ADD CONSTRAINT fk_freight_quotes_request
        FOREIGN KEY (request_id) REFERENCES route_requests (id) ON DELETE CASCADE;

ALTER TABLE quote_idempotency_keys
    ADD CONSTRAINT fk_quote_idempotency_request
        FOREIGN KEY (request_id) REFERENCES route_requests (id) ON DELETE CASCADE;

ALTER TABLE request_status_history
    ADD CONSTRAINT fk_request_status_history_request
        FOREIGN KEY (request_id) REFERENCES route_requests (id) ON DELETE CASCADE;
