ALTER TABLE quote_idempotency_keys
    DROP FOREIGN KEY fk_quote_idempotency_actor,
    DROP FOREIGN KEY fk_quote_idempotency_request,
    DROP FOREIGN KEY fk_quote_idempotency_quote;

ALTER TABLE freight_quotes
    DROP FOREIGN KEY fk_freight_quotes_request,
    DROP FOREIGN KEY fk_freight_quotes_admin_user;

ALTER TABLE freight_quotes
    MODIFY COLUMN id VARCHAR(36) NOT NULL,
    MODIFY COLUMN request_id VARCHAR(36) NOT NULL,
    MODIFY COLUMN admin_user_id VARCHAR(36) NOT NULL;

ALTER TABLE quote_idempotency_keys
    MODIFY COLUMN id VARCHAR(36) NOT NULL,
    MODIFY COLUMN actor_user_id VARCHAR(36) NOT NULL,
    MODIFY COLUMN request_id VARCHAR(36) NULL,
    MODIFY COLUMN quote_id VARCHAR(36) NULL;

ALTER TABLE freight_quotes
    ADD CONSTRAINT fk_freight_quotes_request
        FOREIGN KEY (request_id) REFERENCES route_requests (id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_freight_quotes_admin_user
        FOREIGN KEY (admin_user_id) REFERENCES users (id) ON DELETE RESTRICT;

ALTER TABLE quote_idempotency_keys
    ADD CONSTRAINT fk_quote_idempotency_actor
        FOREIGN KEY (actor_user_id) REFERENCES users (id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_quote_idempotency_request
        FOREIGN KEY (request_id) REFERENCES route_requests (id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_quote_idempotency_quote
        FOREIGN KEY (quote_id) REFERENCES freight_quotes (id) ON DELETE CASCADE;
