import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  TripContractDto,
  TripStatusContract,
  TripsApiService
} from '../../core/api';
import { LayoutService } from '../../core/layout';
import { showAppSnack } from '../../shared/utils/app-snackbar';

@Component({
  selector: 'app-admin-trips',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    TranslateModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatCardModule,
    MatIconModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatTableModule,
    MatTooltipModule
  ],
  templateUrl: './admin-trips.component.html',
  styleUrl: './admin-trips.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminTripsComponent {
  private static readonly DESKTOP_PAGE_SIZE = 10;
  private static readonly HANDSET_PAGE_SIZE = 5;

  private readonly tripsApi = inject(TripsApiService);
  private readonly layout = inject(LayoutService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);

  readonly isHandset = this.layout.isHandset;
  readonly displayedColumns = [
    'tripNumber',
    'title',
    'status',
    'driver',
    'route',
    'plannedStartAt',
    'actions'
  ];
  readonly pageSizeOptions = [5, 10, 25, 50];
  readonly statusOptions: (TripStatusContract | '')[] = [
    '',
    'DRAFT',
    'PLANNED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED'
  ];

  readonly isLoading = signal(false);
  readonly loadError = signal('');
  readonly trips = signal<TripContractDto[]>([]);
  readonly totalElements = signal(0);
  readonly statusFilter = signal<TripStatusContract | ''>('');
  readonly pageIndex = signal(0);
  readonly pageSize = signal(AdminTripsComponent.DESKTOP_PAGE_SIZE);

  constructor() {
    effect(() => {
      this.layout.isHandset();
      this.pageSize.set(
        this.layout.handsetPageSize(
          AdminTripsComponent.DESKTOP_PAGE_SIZE,
          AdminTripsComponent.HANDSET_PAGE_SIZE
        )
      );
    });
    void this.reload();
  }

  async reload(): Promise<void> {
    this.isLoading.set(true);
    this.loadError.set('');
    try {
      const status = this.statusFilter();
      const page = await this.tripsApi.listAdmin({
        view: 'active',
        status: status || undefined,
        page: this.pageIndex(),
        size: this.pageSize()
      });
      this.trips.set(page.content);
      this.totalElements.set(page.totalElements);
    } catch {
      this.trips.set([]);
      this.totalElements.set(0);
      this.loadError.set('pages.adminTrips.loadFailed');
      this.notify('pages.adminTrips.loadFailed', 'error');
    } finally {
      this.isLoading.set(false);
    }
  }

  onStatusFilterChange(status: TripStatusContract | ''): void {
    this.statusFilter.set(status);
    this.pageIndex.set(0);
    void this.reload();
  }

  onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    void this.reload();
  }

  statusLabelKey(status: TripStatusContract): string {
    return `pages.adminTrips.status.${status}`;
  }

  formatDate(iso: string | null): string {
    if (!iso) {
      return '—';
    }
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) {
      return iso;
    }
    return parsed.toLocaleDateString();
  }

  formatDateTime(iso: string | null): string {
    if (!iso) {
      return '—';
    }
    const parsed = Date.parse(iso);
    if (Number.isNaN(parsed)) {
      return iso;
    }
    return new Date(parsed).toLocaleString();
  }

  private notify(messageKey: string, kind: 'success' | 'error' = 'success'): void {
    showAppSnack(this.snackBar, this.translate, messageKey, kind);
  }
}
