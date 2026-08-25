import { HttpInterceptorFn } from '@angular/common/http';
import { NGROK_SKIP_BROWSER_WARNING_HEADERS } from '../http/ngrok-headers';

/**
 * Безкоштовний ngrok повертає interstitial HTML замість API,
 * якщо немає заголовка ngrok-skip-browser-warning.
 */
export const ngrokSkipInterceptor: HttpInterceptorFn = (request, next) => {
  if (request.headers.has('ngrok-skip-browser-warning')) {
    return next(request);
  }

  return next(
    request.clone({
      setHeaders: NGROK_SKIP_BROWSER_WARNING_HEADERS
    })
  );
};
