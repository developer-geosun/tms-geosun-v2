package com.geosun.tms.reference.dto.response;

import java.util.List;

/** Відповідь зі списком груп документів ТС. */
public record VehicleDocumentsResponse(List<VehicleDocumentGroupDto> documents) {}
