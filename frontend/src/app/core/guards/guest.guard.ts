import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard для «гостьових» сторінок (login, register, verify-email, forgot/reset password).
 * Якщо користувач уже авторизований — перенаправляє його на домашню
 * сторінку, щоб над формою входу не показувались меню й дані сесії.
 */
export const guestGuard: CanActivateFn = async (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  await authService.whenSessionRestored();

  if (!authService.isAuthenticated()) {
    return true;
  }

  const returnUrl = route.queryParamMap.get('returnUrl');
  if (returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('//')) {
    return router.parseUrl(returnUrl);
  }

  const target = authService.hasAnyRole(['user']) ? '/routes' : '/main';
  return router.createUrlTree([target]);
};
