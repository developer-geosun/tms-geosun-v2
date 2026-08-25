import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../../shared/models';

/**
 * Guard для перевірки авторизації та ролей маршруту.
 */
export const authGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }

  const allowedRoles = (route.data?.['roles'] as UserRole[] | undefined) ?? [];
  if (allowedRoles.length > 0 && !authService.hasAnyRole(allowedRoles)) {
    return router.createUrlTree(['/main']);
  }

  return true;
};
