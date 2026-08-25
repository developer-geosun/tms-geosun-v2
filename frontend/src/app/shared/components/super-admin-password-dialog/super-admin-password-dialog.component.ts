import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslateModule } from '@ngx-translate/core';

export interface SuperAdminPasswordDialogData {
  messageKey: string;
}

/**
 * Діалог введення пароля суперадміна для чутливих admin-операцій.
 */
@Component({
  selector: 'app-super-admin-password-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    TranslateModule
  ],
  template: `
    <h2 mat-dialog-title>{{ 'common.superAdminPasswordDialog.title' | translate }}</h2>
    <mat-dialog-content>
      <p>{{ data.messageKey | translate }}</p>
      <form [formGroup]="form" (ngSubmit)="submit()">
        <mat-form-field appearance="outline" class="super-admin-password-dialog__field">
          <mat-label>{{ 'common.superAdminPasswordDialog.password' | translate }}</mat-label>
          <input
            matInput
            type="password"
            formControlName="password"
            autocomplete="current-password"
            (keydown.enter)="submit()" />
          @if (form.controls.password.hasError('required') && form.controls.password.touched) {
            <mat-error>{{ 'common.superAdminPasswordDialog.passwordRequired' | translate }}</mat-error>
          }
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" (click)="cancel()">
        {{ 'common.superAdminPasswordDialog.cancel' | translate }}
      </button>
      <button
        mat-flat-button
        color="primary"
        type="button"
        [disabled]="submitting()"
        (click)="submit()">
        {{ 'common.superAdminPasswordDialog.confirm' | translate }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    :host {
      display: block;
      max-width: min(100vw - 24px, 420px);
    }

    .super-admin-password-dialog__field {
      width: 100%;
      margin-top: 0.5rem;
    }

    mat-dialog-actions button {
      min-height: 48px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SuperAdminPasswordDialogComponent {
  readonly data = inject<SuperAdminPasswordDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<SuperAdminPasswordDialogComponent, string | undefined>);
  private readonly formBuilder = inject(FormBuilder);

  readonly submitting = signal(false);

  readonly form = this.formBuilder.nonNullable.group({
    password: ['', Validators.required]
  });

  cancel(): void {
    this.dialogRef.close(undefined);
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }
    this.submitting.set(true);
    this.dialogRef.close(this.form.controls.password.value);
  }
}
