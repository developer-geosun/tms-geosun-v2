import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';

/** Показати перекладене повідомлення з кольором успіху або помилки. */
export function showAppSnack(
  snackBar: MatSnackBar,
  translate: TranslateService,
  messageKey: string,
  kind: 'success' | 'error' = 'success'
): void {
  snackBar.open(translate.instant(messageKey), undefined, {
    duration: kind === 'error' ? 6000 : 3500,
    horizontalPosition: 'center',
    verticalPosition: 'bottom',
    panelClass:
      kind === 'error' ? ['app-snackbar--error'] : ['app-snackbar--success']
  });
}
