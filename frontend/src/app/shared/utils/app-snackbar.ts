import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';
import {
  AppSnackbarComponent,
  AppSnackbarData
} from '../components/app-snackbar/app-snackbar.component';

/** Час показу повідомлення: помилку читають довше за підтвердження дії. */
const SUCCESS_DURATION_MS = 3500;
const ERROR_DURATION_MS = 6000;

/** Показати перекладене повідомлення з кольором успіху або помилки. */
export function showAppSnack(
  snackBar: MatSnackBar,
  translate: TranslateService,
  messageKey: string,
  kind: 'success' | 'error' = 'success',
  messageParams?: Record<string, unknown>
): void {
  const durationMs = kind === 'error' ? ERROR_DURATION_MS : SUCCESS_DURATION_MS;
  const data: AppSnackbarData = {
    message: translate.instant(messageKey, messageParams),
    durationMs,
    closeLabel: translate.instant('common.snackbar.close')
  };

  snackBar.openFromComponent(AppSnackbarComponent, {
    data,
    duration: durationMs,
    horizontalPosition: 'center',
    verticalPosition: 'bottom',
    panelClass: ['app-snackbar', `app-snackbar--${kind}`]
  });
}
