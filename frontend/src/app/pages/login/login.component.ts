import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/services';
import { TranslateModule } from '@ngx-translate/core';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    TranslateModule
  ]
})
export class LoginComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly isLoading = signal(false);
  readonly hasSuccess = signal(false);
  readonly errorCode = signal<'401' | '403' | 'email_not_verified' | 'generic' | null>(null);
  readonly isPasswordVisible = signal(false);

  readonly form = this.formBuilder.nonNullable.group({
    email: [environment.production ? '' : environment.testLogin.email, [Validators.required, Validators.email]],
    password: [environment.production ? '' : environment.testLogin.password, [Validators.required, Validators.minLength(8)]]
  });

  submit(): void {
    if (this.form.invalid || this.isLoading()) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorCode.set(null);
    this.hasSuccess.set(false);
    this.isLoading.set(true);

    this.authService.login(this.form.getRawValue()).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.hasSuccess.set(true);
        // Після входу: клієнти з роллю user — на список маршрутів; інші — на головну.
        const target = this.authService.hasAnyRole(['user']) ? '/routes' : '/main';
        void this.router.navigate([target]);
      },
      error: (error: { status?: number; error?: { code?: string } }) => {
        this.isLoading.set(false);
        this.errorCode.set(this.mapErrorCode(error));
      }
    });
  }

  private mapErrorCode(error: { status?: number; error?: { code?: string } }): '401' | '403' | 'email_not_verified' | 'generic' {
    if (error.status === 403 && error.error?.code === 'EMAIL_NOT_VERIFIED') {
      return 'email_not_verified';
    }
    if (error.status === 401) {
      return '401';
    }
    if (error.status === 403) {
      return '403';
    }
    return 'generic';
  }
}
