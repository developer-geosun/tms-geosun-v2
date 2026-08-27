-- Операційні рейси та звіти водія по витратах.
CREATE TABLE trips (
    id VARCHAR(36) NOT NULL,
    trip_number VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL,
    route_request_id BIGINT NULL,
    title VARCHAR(255) NULL,
    comment VARCHAR(2000) NULL,
    origin_text VARCHAR(512) NULL,
    destination_text VARCHAR(512) NULL,
    planned_start_at DATETIME(6) NULL,
    planned_end_at DATETIME(6) NULL,
    actual_start_at DATETIME(6) NULL,
    actual_end_at DATETIME(6) NULL,
    driver_id VARCHAR(36) NULL,
    combination_id VARCHAR(36) NULL,
    tractor_id VARCHAR(36) NULL,
    trailer_id VARCHAR(36) NULL,
    driver_name VARCHAR(384) NULL,
    tractor_plate VARCHAR(32) NULL,
    trailer_plate VARCHAR(32) NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_trips_trip_number (trip_number),
    UNIQUE KEY uk_trips_route_request (route_request_id),
    KEY idx_trips_status_deleted (is_deleted, status),
    KEY idx_trips_driver (driver_id, is_deleted),
    KEY idx_trips_planned_start (planned_start_at),
    CONSTRAINT fk_trips_route_request
        FOREIGN KEY (route_request_id) REFERENCES route_requests (id),
    CONSTRAINT fk_trips_driver
        FOREIGN KEY (driver_id) REFERENCES drivers (id),
    CONSTRAINT fk_trips_combination
        FOREIGN KEY (combination_id) REFERENCES vehicle_combinations (id),
    CONSTRAINT fk_trips_tractor
        FOREIGN KEY (tractor_id) REFERENCES vehicles (id),
    CONSTRAINT fk_trips_trailer
        FOREIGN KEY (trailer_id) REFERENCES vehicles (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE trip_number_seq (
    seq_year INT NOT NULL,
    last_seq INT NOT NULL,
    PRIMARY KEY (seq_year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE trip_expense_reports (
    id VARCHAR(36) NOT NULL,
    trip_id VARCHAR(36) NOT NULL,
    status VARCHAR(32) NOT NULL,
    submitted_at DATETIME(6) NULL,
    submitted_by_user_id VARCHAR(36) NULL,
    reviewed_at DATETIME(6) NULL,
    reviewed_by_user_id VARCHAR(36) NULL,
    review_comment VARCHAR(2000) NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_trip_expense_reports_trip (trip_id),
    CONSTRAINT fk_trip_expense_reports_trip
        FOREIGN KEY (trip_id) REFERENCES trips (id),
    CONSTRAINT fk_trip_expense_reports_submitted_by
        FOREIGN KEY (submitted_by_user_id) REFERENCES users (id),
    CONSTRAINT fk_trip_expense_reports_reviewed_by
        FOREIGN KEY (reviewed_by_user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE trip_expense_lines (
    id VARCHAR(36) NOT NULL,
    report_id VARCHAR(36) NOT NULL,
    category VARCHAR(32) NOT NULL,
    amount DECIMAL(14, 2) NOT NULL,
    currency_code VARCHAR(3) NOT NULL,
    expense_date DATE NOT NULL,
    description VARCHAR(1000) NULL,
    stored_file_id VARCHAR(36) NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    KEY idx_trip_expense_lines_report (report_id, sort_order),
    CONSTRAINT fk_trip_expense_lines_report
        FOREIGN KEY (report_id) REFERENCES trip_expense_reports (id),
    CONSTRAINT fk_trip_expense_lines_stored_file
        FOREIGN KEY (stored_file_id) REFERENCES stored_files (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
