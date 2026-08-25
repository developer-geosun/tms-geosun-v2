const FRONTEND_ROUTE_SUFFIXES = ['verify-email', 'reset-password'];

/**
 * Визначає Angular base-href з EMAIL_VERIFICATION_LINK_BASE / PASSWORD_RESET_LINK_BASE.
 * Приклад: https://developer-geosun.github.io/tms-geosun-v2/verify-email → /tms-geosun-v2/
 */
export function deriveBaseHrefFromLinkBase(linkBase) {
  const trimmed = (linkBase ?? '').trim();
  if (!trimmed) {
    return '/';
  }

  let pathname = trimmed;
  try {
    pathname = new URL(trimmed).pathname;
  } catch {
    pathname = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  }

  const normalizedPath = pathname.replace(/\/+$/, '') || '/';
  for (const route of FRONTEND_ROUTE_SUFFIXES) {
    const routeSuffix = `/${route}`;
    if (normalizedPath === route || normalizedPath.endsWith(routeSuffix)) {
      const prefix = normalizedPath.slice(0, normalizedPath.length - routeSuffix.length);
      return prefix ? `${prefix}/` : '/';
    }
  }

  const segments = normalizedPath.split('/').filter(Boolean);
  if (segments.length <= 1) {
    return '/';
  }

  return `/${segments.slice(0, -1).join('/')}/`;
}
