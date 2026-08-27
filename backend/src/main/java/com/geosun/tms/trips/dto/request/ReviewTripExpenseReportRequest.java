package com.geosun.tms.trips.dto.request;

import jakarta.validation.constraints.Size;

public record ReviewTripExpenseReportRequest(
    boolean approved, @Size(max = 2000) String reviewComment) {}
