import { ChangeDetectionStrategy, Component, inject, LOCALE_ID, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MAT_DIALOG_DATA, MatDialogConfig, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MAT_NATIVE_DATE_FORMATS, provideNativeDateAdapter } from '@angular/material/core';
import { TranslateModule } from '@ngx-translate/core';
import { CreateRouteRequestContractRequest } from '../../../core/api/route-requests-contracts.model';
import { RouteRequestsApiService } from '../../../core/api/route-requests-api.service';
import { parseOptionalFormNumber } from '../../../core/utils/parse-optional-form-number';
import { getHandsetFriendlyDialogConfig } from '../../utils/handset-friendly-dialog-config';

/** Клас панелі діалогу для глобальних адаптивних стилів (у `styles.scss`). */
export const ROUTE_FREIGHT_REQUEST_DIALOG_PANEL_CLASS = 'route-freight-request-dialog-shell';

/** Конфігурація `MatDialog` для узгодженого вигляду на routes та route-builder. */
export function getRouteFreightRequestDialogConfig(
  data: RouteFreightRequestDialogData
): MatDialogConfig<RouteFreightRequestDialogData> {
  return getHandsetFriendlyDialogConfig({
    maxHeight: 'min(92vh, 720px)',
    disableClose: true,
    panelClass: ROUTE_FREIGHT_REQUEST_DIALOG_PANEL_CLASS,
    data
  });
}

@Component({
  selector: 'app-route-freight-request-dialog',
  standalone: true,
  imports: [
    TranslateModule,
    MatDialogModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatDatepickerModule,
    MatProgressSpinnerModule,
    ReactiveFormsModule
  ],
  providers: [
    provideNativeDateAdapter({
      parse: MAT_NATIVE_DATE_FORMATS.parse,
      display: {
        ...MAT_NATIVE_DATE_FORMATS.display,
        dateInput: { year: 'numeric', month: '2-digit', day: '2-digit' }
      }
    })
  ],
  templateUrl: './route-freight-request-dialog.component.html',
  styleUrl: './route-freight-request-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'route-freight-request-dialog-host' }
})
export class RouteFreightRequestDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<RouteFreightRequestDialogComponent, boolean>);
  readonly data = inject(MAT_DIALOG_DATA) as RouteFreightRequestDialogData;
  private readonly formBuilder = inject(FormBuilder);
  private readonly routeRequestsApi = inject(RouteRequestsApiService);
  private readonly router = inject(Router);
  private readonly dateTimeFormatter = new Intl.DateTimeFormat(inject(LOCALE_ID), {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  /** Помилка відправки (ключ перекладу). */
  readonly submitErrorKey = signal<string | null>(null);
  readonly isSubmitting = signal(false);

  readonly form = this.formBuilder.group({
    preferredStartDate: this.formBuilder.control<Date | null>(null),
    comment: this.formBuilder.nonNullable.control(''),
    cargoType: this.formBuilder.nonNullable.control(''),
    cargoWeightKg: this.formBuilder.nonNullable.control(''),
    cargoVolumeM3: this.formBuilder.nonNullable.control('')
  });

  /** Відображення дати маршруту у діалозі. */
  formatRouteDateTime(isoDateTime: string | null | undefined): string {
    if (!isoDateTime) {
      return '—';
    }
    const parsedDate = new Date(isoDateTime);
    if (Number.isNaN(parsedDate.getTime())) {
      return isoDateTime;
    }
    return this.dateTimeFormatter.format(parsedDate);
  }

  /** Довжина маршруту для підсумку (км). */
  formatDistanceKm(): string {
    return (this.data.distanceKm ?? 0).toFixed(1);
  }

  cancel(): void {
    this.dialogRef.close(false);
  }

  async submit(): Promise<void> {
    this.submitErrorKey.set(null);
    this.isSubmitting.set(true);
    try {
      await this.routeRequestsApi.createRouteRequest(this.buildPayload());
      this.form.reset({
        preferredStartDate: null,
        comment: '',
        cargoType: '',
        cargoWeightKg: '',
        cargoVolumeM3: ''
      });
      this.dialogRef.close(true);
      void this.router.navigate(['/my-freight-requests']);
    } catch {
      this.submitErrorKey.set('pages.freightCalculation.errors.submitFailed');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  private buildPayload(): CreateRouteRequestContractRequest {
    const values = this.form.getRawValue();
    const cargoType = values.cargoType.trim();
    const cargoWeightKg = parseOptionalFormNumber(values.cargoWeightKg);
    const cargoVolumeM3 = parseOptionalFormNumber(values.cargoVolumeM3);
    const hasCargo = Boolean(cargoType) || cargoWeightKg !== null || cargoVolumeM3 !== null;

    return {
      routeId: this.data.routeId,
      preferredStartDate: this.formatDateForApi(values.preferredStartDate),
      comment: values.comment.trim() || null,
      cargo: hasCargo
        ? {
            type: cargoType || null,
            weightKg: cargoWeightKg,
            volumeM3: cargoVolumeM3
          }
        : null
    };
  }

  /** Локальна дата у форматі YYYY-MM-DD для API (без зсуву UTC). */
  private formatDateForApi(value: Date | null): string | null {
    if (!value || !(value instanceof Date) || Number.isNaN(value.getTime())) {
      return null;
    }
    const y = value.getFullYear();
    const m = value.getMonth() + 1;
    const d = value.getDate();
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

}

export interface RouteFreightRequestDialogData {
  routeId: string;
  createdAt: string | null;
  updatedAt: string | null;
  pointsCount: number;
  distanceKm: number | null;
}
