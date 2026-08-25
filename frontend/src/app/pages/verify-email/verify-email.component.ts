import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';
import { take } from 'rxjs';
import { AuthService } from '../../core/services';

type VerificationStatus = 'idle' | 'loading' | 'success' | 'invalid' | 'error';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    TranslateModule
  ],
  templateUrl: './verify-email.component.html',
  styleUrls: ['./verify-email.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VerifyEmailComponent {
  private readonly authService = inject(AuthService);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly status = signal<VerificationStatus>('idle');

  constructor() {
    this.activatedRoute.queryParamMap.pipe(take(1)).subscribe((params) => {
      const token = params.get('token')?.trim() ?? '';
      if (!token) {
        this.status.set('invalid');
        return;
      }
      this.verifyToken(token);
    });
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  private verifyToken(token: string): void {
    this.status.set('loading');
    this.authService.verifyEmail({ token }).subscribe({
      next: () => {
        this.status.set('success');
      },
      error: (error: { status?: number }) => {
        if (error.status === 400) {
          this.status.set('invalid');
          return;
        }
        this.status.set('error');
      }
    });
  }
}
