import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard для «гостьових» сторінок (login, register, verify-email, forgot/reset password).
 * Якщо користувач уже авторизований — перенаправляє його на домашню
 * сторінку, щоб над формою входу не показувались меню й дані сесії.
 */
export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return true;
  }

  const target = authService.hasAnyRole(['user']) ? '/routes' : '/main';
  return router.createUrlTree([target]);
};
