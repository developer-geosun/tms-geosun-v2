package com.geosun.tms.routes.api;

/**
 * Централізовані шляхи route-модуля (контрактний шар, без реалізації).
 */
public final class RoutesApiPaths {
  public static final String ROUTES_BASE = "/api/v1/routes";
  public static final String ROUTES_MY = "/api/v1/routes/my";
  public static final String ROUTE_REQUESTS_BASE = "/api/v1/route-requests";
  public static final String ROUTE_REQUESTS_MY = "/api/v1/route-requests/my";
  public static final String ADMIN_ROUTE_REQUESTS_BASE = "/api/v1/admin/route-requests";
  public static final String ADMIN_QUOTES_BASE = "/api/v1/admin/quotes";

  private RoutesApiPaths() {}
}
