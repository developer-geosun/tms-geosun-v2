package com.geosun.tms.routes.dto.request;

/** Тіло відправки пропозиції; messageBody опційний текст листа клієнту. */
public record SendQuoteRequest(String messageBody) {}
