CREATE TABLE currency_nbu_rates (
    currency_code CHAR(3) NOT NULL,
    rate_date DATE NOT NULL,
    rate DECIMAL(18, 6) NOT NULL,
    nbu_units INT NOT NULL,
    rate_per_unit DECIMAL(18, 6) NOT NULL,
    special CHAR(1) NULL,
    fetched_at DATETIME(6) NOT NULL,
    PRIMARY KEY (currency_code, rate_date),
    KEY idx_currency_nbu_rates_date_code (rate_date DESC, currency_code),
    CONSTRAINT fk_currency_nbu_rates_currency
        FOREIGN KEY (currency_code) REFERENCES currencies (code) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
