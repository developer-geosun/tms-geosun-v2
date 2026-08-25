CREATE TABLE freight_quotes (
    id CHAR(36) NOT NULL,
    request_id CHAR(36) NOT NULL,
    admin_user_id CHAR(36) NOT NULL,
    currency VARCHAR(8) NOT NULL,
    total_amount DECIMAL(14,2) NOT NULL,
    transit_days_min INT NULL,
    transit_days_max INT NULL,
    valid_until DATE NULL,
    status VARCHAR(32) NOT NULL,
    public_note TEXT NULL,
    internal_note TEXT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    sent_at DATETIME(6) NULL,
    PRIMARY KEY (id),
    KEY idx_freight_quotes_request_created_at (request_id, created_at),
    KEY idx_freight_quotes_status_sent_at (status, sent_at),
    CONSTRAINT fk_freight_quotes_request
        FOREIGN KEY (request_id) REFERENCES route_requests (id) ON DELETE CASCADE,
    CONSTRAINT fk_freight_quotes_admin_user
        FOREIGN KEY (admin_user_id) REFERENCES users (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE quote_idempotency_keys (
    id CHAR(36) NOT NULL,
    operation_type VARCHAR(32) NOT NULL,
    idempotency_key VARCHAR(128) NOT NULL,
    actor_user_id CHAR(36) NOT NULL,
    request_id CHAR(36) NULL,
    quote_id CHAR(36) NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_quote_idempotency_scope (operation_type, idempotency_key, actor_user_id),
    KEY idx_quote_idempotency_request (request_id),
    KEY idx_quote_idempotency_quote (quote_id),
    CONSTRAINT fk_quote_idempotency_actor
        FOREIGN KEY (actor_user_id) REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT fk_quote_idempotency_request
        FOREIGN KEY (request_id) REFERENCES route_requests (id) ON DELETE CASCADE,
    CONSTRAINT fk_quote_idempotency_quote
        FOREIGN KEY (quote_id) REFERENCES freight_quotes (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
