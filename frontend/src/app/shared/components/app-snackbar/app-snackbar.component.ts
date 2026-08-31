import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  inject,
  signal
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MAT_SNACK_BAR_DATA, MatSnackBarRef } from '@angular/material/snack-bar';

/** Дані єдиного snackbar застосунку (текст уже перекладено у `showAppSnack`). */
export interface AppSnackbarData {
  readonly message: string;
  readonly durationMs: number;
  readonly closeLabel: string;
}

/** Крок таймера: компроміс між плавністю кільця і кількістю перевірок змін. */
const TIMER_TICK_MS = 100;

@Component({
  selector: 'app-snackbar',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <span class="app-snackbar__message">{{ data.message }}</span>
    <span class="app-snackbar__timer">
      <mat-progress-spinner
        class="app-snackbar__timer-ring"
        mode="determinate"
        [diameter]="34"
        [strokeWidth]="2"
        [value]="remainingPercent()" />
      <button
        mat-icon-button
        type="button"
        class="app-snackbar__close"
        [attr.aria-label]="data.closeLabel"
        (click)="dismiss()">
        <mat-icon fontIcon="close" />
      </button>
    </span>
  `,
  styles: `
    :host {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      color: inherit;
    }

    .app-snackbar__message {
      flex: 1 1 auto;
      min-width: 0;
    }

    /* Кільце таймера огортає кнопку закриття, тому обидва елементи в одній комірці. */
    .app-snackbar__timer {
      position: relative;
      flex: 0 0 auto;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
    }

    .app-snackbar__timer-ring {
      --mat-progress-spinner-active-indicator-color: currentColor;
      position: absolute;
      top: 0;
      left: 0;
      opacity: 0.75;
    }

    .app-snackbar__close {
      --mat-icon-button-state-layer-size: 26px;
      --mat-icon-button-icon-size: 16px;
      --mat-icon-button-icon-color: currentColor;
    }

    .app-snackbar__close mat-icon {
      width: var(--mat-icon-button-icon-size);
      height: var(--mat-icon-button-icon-size);
      font-size: var(--mat-icon-button-icon-size);
      line-height: var(--mat-icon-button-icon-size);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppSnackbarComponent implements OnInit, OnDestroy {
  readonly data = inject<AppSnackbarData>(MAT_SNACK_BAR_DATA);
  private readonly snackBarRef = inject<MatSnackBarRef<AppSnackbarComponent>>(MatSnackBarRef);

  /** Залишок часу до автозакриття у відсотках (100 → 0). */
  protected readonly remainingPercent = signal(100);

  private timerId?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    const startedAt = Date.now();
    this.timerId = setInterval(() => {
      const left = 1 - (Date.now() - startedAt) / this.data.durationMs;
      this.remainingPercent.set(Math.max(0, Math.round(left * 100)));
    }, TIMER_TICK_MS);
  }

  ngOnDestroy(): void {
    clearInterval(this.timerId);
  }

  protected dismiss(): void {
    this.snackBarRef.dismiss();
  }
}
