import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router, UrlTree } from '@angular/router';
import { ConfigService } from '../services/config.service';

/**
 * Guard для редиректа на страницу stop-service при активации настройки isServiceStopped
 * Исключает из редиректа саму страницу stop-service и страницу 404
 */
export const serviceStopGuard: CanActivateFn = (route: ActivatedRouteSnapshot): boolean | UrlTree => {
  const configService = inject(ConfigService);
  const router = inject(Router);

  // Якщо сервіс не зупинено, доступ дозволений
  if (!configService.isServiceStopped) {
    return true;
  }

  const currentPath = route.routeConfig?.path ?? '';

  // Не редиректимо службові сторінки, щоб уникнути циклів
  if (currentPath === 'stop-service' || currentPath === '404') {
    return true;
  }

  return router.createUrlTree(['/stop-service']);
};

