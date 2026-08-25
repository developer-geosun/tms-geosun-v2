import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AuthAvailabilityService } from '../../core/services';

/**
 * Компонент сторінки зупинки сервісу
 */
@Component({
  selector: 'app-stop-service',
  templateUrl: './stop-service.component.html',
  styleUrls: ['./stop-service.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [TranslateModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule]
})
export class StopServiceComponent {
  private readonly authAvailabilityService = inject(AuthAvailabilityService);
  private readonly router = inject(Router);

  readonly isChecking = signal(false);

  refresh(): void {
    if (this.isChecking()) {
      return;
    }

    this.isChecking.set(true);
    this.authAvailabilityService.checkOnStartup().subscribe({
      next: () => {
        this.isChecking.set(false);
        if (this.authAvailabilityService.isAvailable()) {
          void this.router.navigate(['/login']);
        }
      },
      error: () => {
        this.isChecking.set(false);
      }
    });
  }
}
