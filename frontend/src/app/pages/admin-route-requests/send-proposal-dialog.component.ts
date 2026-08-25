import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';
import { RoutePointContract, RouteRequestsApiService } from '../../core/api';

export interface SendProposalDialogData {
  requestId: number;
  requesterEmail: string;
  calculationId: string;
  totalProposalAmount: number;
  proposalCurrency: string;
  routePoints: RoutePointContract[];
}

@Component({
  selector: 'app-send-proposal-dialog',
  standalone: true,
  imports: [
    TranslateModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './send-proposal-dialog.component.html',
  styleUrl: './send-proposal-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SendProposalDialogComponent {
  readonly data = inject<SendProposalDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<SendProposalDialogComponent, boolean>);
  private readonly formBuilder = inject(FormBuilder);
  private readonly routeRequestsApi = inject(RouteRequestsApiService);

  readonly isSubmitting = signal(false);
  readonly submitErrorKey = signal('');

  readonly form = this.formBuilder.nonNullable.group({
    recipientEmail: [{ value: this.data.requesterEmail, disabled: true }],
    messageBody: [this.buildDefaultMessage(), [Validators.required, Validators.minLength(3)]]
  });

  cancel(): void {
    this.dialogRef.close(false);
  }

  async confirmSend(): Promise<void> {
    if (this.form.invalid || this.isSubmitting()) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitErrorKey.set('');
    this.isSubmitting.set(true);
    try {
      const draft = await this.routeRequestsApi.createAdminQuote(
        this.data.requestId,
        { fromCostCalculationId: this.data.calculationId },
        this.nextIdempotencyKey('create')
      );
      await this.routeRequestsApi.sendAdminQuote(draft.id, this.nextIdempotencyKey('send'), {
        messageBody: this.form.controls.messageBody.value.trim()
      });
      this.dialogRef.close(true);
    } catch {
      this.submitErrorKey.set('pages.adminRouteRequests.sendProposalFailed');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  private buildDefaultMessage(): string {
    const amount = this.formatAmount(this.data.totalProposalAmount);
    const currency = (this.data.proposalCurrency || '').trim().toUpperCase() || 'EUR';
    const lines: string[] = [];
    lines.push(`Пропозиція: ${amount} ${currency}`);
    lines.push('');
    lines.push('Точки маршруту:');
    const points = [...(this.data.routePoints ?? [])].sort((a, b) => a.order - b.order);
    if (!points.length) {
      lines.push('—');
    } else {
      for (const point of points) {
        const label = point.address?.trim() || `${point.lat}, ${point.lng}`;
        const segment =
          point.segmentDistanceKmToNext != null && point.segmentDistanceKmToNext > 0
            ? ` → ${point.segmentDistanceKmToNext.toFixed(3)} км`
            : '';
        lines.push(`${point.order}. ${point.type}: ${label}${segment}`);
      }
    }
    return lines.join('\n');
  }

  private formatAmount(value: number): string {
    return new Intl.NumberFormat('uk-UA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  private nextIdempotencyKey(operation: string): string {
    return `${operation}-${this.data.requestId}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}
