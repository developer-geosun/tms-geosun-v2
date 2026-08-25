import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, LOCALE_ID, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { CountryDistanceContractDto, RouteRequestContractDto, RouteRequestsApiService } from '../../core/api';
import { RoutePointContract } from '../../core/api/routes-contracts.model';

/**
 * Сторінка перегляду власних заявок на розрахунок фрахту (користувач).
 */
@Component({
  selector: 'app-my-freight-requests',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatExpansionModule,
    MatListModule
  ],
  templateUrl: './my-freight-requests.component.html',
  styleUrl: './my-freight-requests.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MyFreightRequestsComponent {
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
  private readonly dateFormatter = new Intl.DateTimeFormat(inject(LOCALE_ID), {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  readonly requests = signal<RouteRequestContractDto[]>([]);
  readonly isLoading = signal(true);
  readonly loadFailed = signal(false);

  constructor() {
    void this.reload();
  }

  async reload(): Promise<void> {
    this.isLoading.set(true);
    this.loadFailed.set(false);
    try {
      const list = await this.routeRequestsApi.getMyRouteRequests();
      const sorted = [...list].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      this.requests.set(sorted);
    } catch {
      this.requests.set([]);
      this.loadFailed.set(true);
    } finally {
      this.isLoading.set(false);
    }
  }

  formatDateTime(iso: string | null | undefined): string {
    if (!iso) {
      return '';
    }
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : this.dateTimeFormatter.format(d);
  }

  formatPreferredDate(value: string | null | undefined): string {
    if (!value) {
      return '';
    }
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value : this.dateFormatter.format(d);
  }

  requestStatusKey(status: string): string {
    return `pages.myFreightRequests.requestStatus.${this.normalizeEnumKey(status)}`;
  }

  quoteStatusKey(status: string): string {
    return `pages.myFreightRequests.quoteStatus.${this.normalizeEnumKey(status)}`;
  }

  requestStatusChipClass(status: string): string {
    const key = this.normalizeEnumKey(status);
    return `req-status-chip req-status-chip--${key}`;
  }

  countryDistanceKm(entry: CountryDistanceContractDto): string {
    return (entry.distanceMeters / 1000).toFixed(1);
  }

  /** Номер кроку в ланцюгу країн (1-based); якщо API не передав порядок — за індексом у списку. */
  countryStepNumber(entry: CountryDistanceContractDto, index: number): number {
    const o = entry.alongRouteOrder;
    return o != null && typeof o === 'number' && !Number.isNaN(o) ? o + 1 : index + 1;
  }

  sortedPoints(points: RoutePointContract[]): RoutePointContract[] {
    return [...points].sort((a, b) => a.order - b.order);
  }

  async openRoute(routeId: string): Promise<void> {
    await this.router.navigate(['/route-builder'], { queryParams: { routeId, mode: 'view' } });
  }

  private normalizeEnumKey(value: string): string {
    return value.trim().toLowerCase();
  }
}
