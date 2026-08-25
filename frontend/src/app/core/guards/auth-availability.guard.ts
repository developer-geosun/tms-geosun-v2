import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router, UrlTree } from '@angular/router';
import { map } from 'rxjs';
import { AuthAvailabilityService } from '../services';

/**
 * Guard для редиректу на stop-service, якщо auth-сервер недоступний або health не UP
 */
export const authAvailabilityGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot
): ReturnType<CanActivateFn> => {
  const authAvailabilityService = inject(AuthAvailabilityService);
  const router = inject(Router);

  const currentPath = route.routeConfig?.path ?? '';
  if (currentPath === 'stop-service' || currentPath === '404') {
    return true;
  }

  return authAvailabilityService.checkOnStartup().pipe(
    map((): boolean | UrlTree =>
      authAvailabilityService.isAvailable() ? true : router.createUrlTree(['/stop-service'])
    )
  );
};
