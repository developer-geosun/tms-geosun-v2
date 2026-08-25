package com.geosun.tms.routes.dto.request;

/**
 * Технічні метадані маршруту від HERE, що фіксуються разом зі snapshot.
 */
public record HereRouteMetaRequest(String provider, String routeHandle, String apiVersion) {}
