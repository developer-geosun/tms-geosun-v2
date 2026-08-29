import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { firstValueFrom } from 'rxjs';
import {
  DriverContractDto,
  DriverDocumentComplianceContract,
  DriverDocumentsFilterContract,
  DriverListViewContract,
  DriversApiService
} from '../../core/api';
import { LayoutService } from '../../core/layout';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { getHandsetFriendlyDialogConfig } from '../../shared/utils/handset-friendly-dialog-config';
import { showAppSnack } from '../../shared/utils/app-snackbar';
import { DriverFormDialogComponent } from './driver-form-dialog.component';

@Component({
  selector: 'app-admin-drivers',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatCardModule,
    MatDialogModule,
    MatIconModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatTableModule,
    MatTooltipModule
  ],
  templateUrl: './admin-drivers.component.html',
  styleUrl: './admin-drivers.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminDriversComponent {
  private static readonly DESKTOP_PAGE_SIZE = 10;
  private static readonly HANDSET_PAGE_SIZE = 5;

  private readonly driversApi = inject(DriversApiService);
  private readonly dialog = inject(MatDialog);
  private readonly layout = inject(LayoutService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);

  readonly isHandset = this.layout.isHandset;
  readonly displayedColumns = [
    'fullName',
    'phone',
    'licenseNumber',
    'licenseCategories',
    'licenseExpiresOn',
    'userEmail',
    'documents',
    'status',
    'actions'
  ];
  readonly pageSizeOptions = [5, 10, 25, 50];

  readonly isLoading = signal(false);
  readonly loadError = signal('');
  /** Повний список з API (view=all) для лічильників і клієнтського фільтра. */
  readonly allDrivers = signal<DriverContractDto[]>([]);
  readonly listView = signal<DriverListViewContract>('all');
  readonly documentsFilter = signal<DriverDocumentsFilterContract>('all');
  readonly pageIndex = signal(0);
  readonly pageSize = signal(AdminDriversComponent.DESKTOP_PAGE_SIZE);

  readonly countAll = computed(() => this.allDrivers().length);
  readonly countActive = computed(
    () => this.allDrivers().filter((d) => !d.deleted).length
  );
  readonly countDeleted = computed(
    () => this.allDrivers().filter((d) => d.deleted).length
  );

  readonly drivers = computed(() => {
    const all = this.allDrivers();
    let byStatus: DriverContractDto[];
    switch (this.listView()) {
      case 'active':
        byStatus = all.filter((d) => !d.deleted);
        break;
      case 'deleted':
        byStatus = all.filter((d) => d.deleted);
        break;
      default:
        byStatus = all;
    }
    const docsFilter = this.documentsFilter();
    if (docsFilter === 'all') {
      return byStatus;
    }
    const complianceMap: Record<
      Exclude<DriverDocumentsFilterContract, 'all'>,
      DriverDocumentComplianceContract
    > = {
      ok: 'OK',
      attention: 'ATTENTION',
      problem: 'PROBLEM'
    };
    const needed = complianceMap[docsFilter];
    return byStatus.filter((d) => d.documentCompliance === needed);
  });

  readonly pagedDrivers = computed(() => {
    const filtered = this.drivers();
    const start = this.pageIndex() * this.pageSize();
    return filtered.slice(start, start + this.pageSize());
  });

  constructor() {
    effect(() => {
      this.layout.isHandset();
      this.pageSize.set(
        this.layout.handsetPageSize(
          AdminDriversComponent.DESKTOP_PAGE_SIZE,
          AdminDriversComponent.HANDSET_PAGE_SIZE
        )
      );
      this.clampPageIndex();
    });
    void this.reload();
  }

  async reload(): Promise<void> {
    this.isLoading.set(true);
    this.loadError.set('');
    try {
      const list = await this.driversApi.list('all');
      this.allDrivers.set(list);
      this.clampPageIndex();
    } catch {
      this.loadError.set('pages.adminDrivers.loadFailed');
      this.notify('pages.adminDrivers.loadFailed', 'error');
    } finally {
      this.isLoading.set(false);
    }
  }

  onViewChange(view: DriverListViewContract | undefined): void {
    if (!view) {
      return;
    }
    this.listView.set(view);
    this.pageIndex.set(0);
  }

  onDocumentsFilterChange(filter: DriverDocumentsFilterContract | undefined): void {
    if (!filter) {
      return;
    }
    this.documentsFilter.set(filter);
    this.pageIndex.set(0);
  }

  complianceLabelKey(compliance: DriverDocumentComplianceContract): string {
    return `pages.adminDrivers.compliance.${compliance}`;
  }

  onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }

  fullName(row: DriverContractDto): string {
    return [row.lastName, row.firstName, row.patronymic].filter(Boolean).join(' ');
  }

  async openCreate(): Promise<void> {
    await this.openFormDialog(null);
  }

  async openEdit(row: DriverContractDto): Promise<void> {
    await this.openFormDialog(row);
  }

  async softDelete(row: DriverContractDto): Promise<void> {
    const ok = await firstValueFrom(
      this.dialog
        .open(ConfirmDialogComponent, {
          data: { messageKey: 'pages.adminDrivers.deleteConfirm' }
        })
        .afterClosed()
    );
    if (!ok) {
      return;
    }
    try {
      await this.driversApi.softDelete(row.id);
      this.notify('pages.adminDrivers.deleteSuccess');
      await this.reload();
    } catch (err) {
      this.notify(this.mapError(err, 'pages.adminDrivers.deleteFailed'), 'error');
    }
  }

  async restore(row: DriverContractDto): Promise<void> {
    const ok = await firstValueFrom(
      this.dialog
        .open(ConfirmDialogComponent, {
          data: { messageKey: 'pages.adminDrivers.restoreConfirm' }
        })
        .afterClosed()
    );
    if (!ok) {
      return;
    }
    try {
      await this.driversApi.restore(row.id);
      this.notify('pages.adminDrivers.restoreSuccess');
      await this.reload();
    } catch (err) {
      this.notify(this.mapError(err, 'pages.adminDrivers.restoreFailed'), 'error');
    }
  }

  private clampPageIndex(): void {
    const maxPage = Math.max(0, Math.ceil(this.drivers().length / this.pageSize()) - 1);
    if (this.pageIndex() > maxPage) {
      this.pageIndex.set(maxPage);
    }
  }

  private async openFormDialog(driver: DriverContractDto | null): Promise<void> {
    const ref = this.dialog.open(
      DriverFormDialogComponent,
      getHandsetFriendlyDialogConfig({
        width: 'min(640px, calc(100vw - 24px))',
        maxHeight: 'min(92vh, 900px)',
        data: { driver }
      })
    );
    const changed = await firstValueFrom(ref.afterClosed());
    if (changed) {
      await this.reload();
    }
  }

  private notify(messageKey: string, kind: 'success' | 'error' = 'success'): void {
    showAppSnack(this.snackBar, this.translate, messageKey, kind);
  }

  private mapError(err: unknown, fallback: string): string {
    const code = (err as { error?: { code?: string } })?.error?.code;
    switch (code) {
      case 'LICENSE_ALREADY_EXISTS':
        return 'pages.adminDrivers.errors.LICENSE_ALREADY_EXISTS';
      case 'DRIVER_DELETED':
        return 'pages.adminDrivers.errors.DRIVER_DELETED';
      case 'DRIVER_IN_ACTIVE_TRIP':
        return 'pages.adminDrivers.errors.DRIVER_IN_ACTIVE_TRIP';
      case 'USER_ALREADY_LINKED':
        return 'pages.adminDrivers.errors.USER_ALREADY_LINKED';
      case 'USER_ROLE_NOT_LINKABLE':
        return 'pages.adminDrivers.errors.USER_ROLE_NOT_LINKABLE';
      case 'NOT_FOUND':
        return 'pages.adminDrivers.errors.NOT_FOUND';
      case 'VALIDATION_ERROR':
        return 'pages.adminDrivers.errors.VALIDATION_ERROR';
      default:
        return fallback;
    }
  }
}
