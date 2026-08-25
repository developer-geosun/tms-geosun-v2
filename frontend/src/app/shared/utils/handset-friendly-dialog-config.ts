import { MatDialogConfig } from '@angular/material/dialog';

/** Спільний panelClass для full-screen form-діалогів на handset (styles.scss). */
export const HANDSET_FULLSCREEN_DIALOG_PANEL_CLASS = 'dialog-shell--handset-fullscreen';

/** Базовий конфіг MatDialog, зручний на вузьких екранах. */
export function getHandsetFriendlyDialogConfig<T>(
  partial: MatDialogConfig<T> = {}
): MatDialogConfig<T> {
  const existingPanelClass = partial.panelClass;
  const panelClasses = new Set<string>([HANDSET_FULLSCREEN_DIALOG_PANEL_CLASS]);

  if (typeof existingPanelClass === 'string' && existingPanelClass.trim()) {
    panelClasses.add(existingPanelClass);
  } else if (Array.isArray(existingPanelClass)) {
    for (const cls of existingPanelClass) {
      if (cls) {
        panelClasses.add(cls);
      }
    }
  }

  return {
    width: 'min(520px, calc(100vw - 24px))',
    maxWidth: '100vw',
    maxHeight: 'min(92vh, 720px)',
    autoFocus: 'first-tabbable',
    restoreFocus: true,
    ...partial,
    panelClass: [...panelClasses]
  };
}
