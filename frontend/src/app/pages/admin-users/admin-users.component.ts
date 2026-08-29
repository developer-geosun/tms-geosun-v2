import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateService } from '@ngx-translate/core';
import {
  AdminUserRole,
  UserAdminContractDto,
  UsersAdminApiService
} from '../../core/api';
import { LayoutService } from '../../core/layout';
import { AuthService } from '../../core/services/auth.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { SuperAdminPasswordDialogComponent } from '../../shared/components/super-admin-password-dialog/super-admin-password-dialog.component';
import { showAppSnack } from '../../shared/utils/app-snackbar';
import { getHandsetFriendlyDialogConfig } from '../../shared/utils/handset-friendly-dialog-config';
import {
  FilterUsersDialogComponent,
  FilterUsersDialogResult
} from './filter-users-dialog.component';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatPaginatorModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatSortModule,
    MatTableModule,
    MatProgressBarModule,
    MatTooltipModule
  ],
  templateUrl: './admin-users.component.html',
  styleUrl: './admin-users.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminUsersComponent implements AfterViewInit {
  private static readonly DESKTOP_PAGE_SIZE = 10;
  private static readonly HANDSET_PAGE_SIZE = 5;

  private readonly usersApi = inject(UsersAdminApiService);
  private readonly layout = inject(LayoutService);
  private readonly authService = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly formBuilder = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);

  readonly roleOptions: AdminUserRole[] = ['USER', 'MANAGER', 'DRIVER', 'ADMIN'];
  readonly pageSizeOptions = [5, 10, 15, 25, 50];
  readonly displayedColumns = [
    'email',
    'role',
    'active',
    'emailVerified',
    'createdAt',
    'actions'
  ] as const;

  readonly users = signal<UserAdminContractDto[]>([]);
  readonly totalElements = signal(0);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(AdminUsersComponent.DESKTOP_PAGE_SIZE);
  readonly sortField = signal('createdAt');
  readonly sortOrder = signal<'asc' | 'desc'>('desc');
  readonly isLoading = signal(false);
  readonly loadError = signal('');
  readonly updatingIds = signal<Set<string>>(new Set());
  /** Збільшується, щоб пересоздати mat-select і скинути UI після скасування/помилки */
  readonly roleSelectEpoch = signal(0);
  readonly isHandset = this.layout.isHandset;

  readonly filterForm = this.formBuilder.nonNullable.group({
    email: [''],
    role: ['' as '' | AdminUserRole],
    active: ['' as '' | 'true' | 'false'],
    deleted: ['false' as '' | 'true' | 'false']
  });

  /** true, якщо застосовано параметри, відмінні від дефолтних */
  readonly filtersActive = signal(false);

  private lastHandsetViewport: boolean | null = null;

  @ViewChild(MatPaginator) private paginator?: MatPaginator;

  constructor() {
    effect(() => {
      const isHandset = this.layout.isHandset();
      const previous = this.lastHandsetViewport;
      this.lastHandsetViewport = isHandset;
      if (previous === null || previous === isHandset) {
        if (previous === null) {
          this.pageSize.set(
            this.layout.handsetPageSize(
              AdminUsersComponent.DESKTOP_PAGE_SIZE,
              AdminUsersComponent.HANDSET_PAGE_SIZE
            )
          );
        }
        return;
      }
      this.pageSize.set(
        isHandset
          ? AdminUsersComponent.HANDSET_PAGE_SIZE
          : AdminUsersComponent.DESKTOP_PAGE_SIZE
      );
      this.pageIndex.set(0);
      void this.reload();
    });
    void this.reload();
  }

  ngAfterViewInit(): void {
    if (this.paginator) {
      this.paginator.pageSize = this.pageSize();
    }
  }

  isCurrentUser(row: UserAdminContractDto): boolean {
    return this.authService.user()?.id === row.id;
  }

  isUpdating(id: string): boolean {
    return this.updatingIds().has(id);
  }

  async reload(): Promise<void> {
    this.isLoading.set(true);
    this.loadError.set('');
    try {
      const filters = this.filterForm.getRawValue();
      const page = await this.usersApi.list({
        email: filters.email || undefined,
        role: filters.role || undefined,
        active: filters.active === '' ? undefined : filters.active === 'true',
        deleted: filters.deleted === '' ? undefined : filters.deleted === 'true',
        sort: this.sortField(),
        order: this.sortOrder(),
        page: this.pageIndex(),
        size: this.pageSize()
      });
      this.users.set(page.content);
      this.totalElements.set(page.totalElements);
    } catch {
      this.users.set([]);
      this.totalElements.set(0);
      this.loadError.set('pages.adminUsers.loadFailed');
    } finally {
      this.isLoading.set(false);
    }
  }

  async applyFilters(): Promise<void> {
    this.filtersActive.set(this.hasActiveFilters());
    this.pageIndex.set(0);
    await this.reload();
  }

  async resetFilters(): Promise<void> {
    this.filterForm.reset({
      email: '',
      role: '',
      active: '',
      deleted: 'false'
    });
    this.filtersActive.set(false);
    this.pageIndex.set(0);
    await this.reload();
  }

  async openFiltersDialog(): Promise<void> {
    const ref = this.dialog.open(
      FilterUsersDialogComponent,
      getHandsetFriendlyDialogConfig({
        width: 'min(520px, calc(100vw - 24px))',
        maxHeight: 'min(92vh, 760px)',
        data: {
          filters: this.filterForm.getRawValue(),
          roleOptions: this.roleOptions
        }
      })
    );
    const result = await firstValueFrom(ref.afterClosed()) as FilterUsersDialogResult | undefined;
    if (!result) {
      return;
    }
    if (result.action === 'reset') {
      await this.resetFilters();
      return;
    }
    this.filterForm.patchValue(result.values);
    await this.applyFilters();
  }

  /** Чи відрізняються поточні фільтри від дефолтних (кнопка — інверсний стиль). */
  private hasActiveFilters(): boolean {
    const filters = this.filterForm.getRawValue();
    return (
      !!filters.email.trim() ||
      !!filters.role ||
      !!filters.active ||
      filters.deleted !== 'false'
    );
  }

  onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    void this.reload();
  }

  onSort(sort: Sort): void {
    if (!sort.active || !sort.direction) {
      this.sortField.set('createdAt');
      this.sortOrder.set('desc');
    } else {
      this.sortField.set(sort.active);
      this.sortOrder.set(sort.direction === 'asc' ? 'asc' : 'desc');
    }
    this.pageIndex.set(0);
    void this.reload();
  }

  async onRoleChange(row: UserAdminContractDto, role: AdminUserRole): Promise<void> {
    if (this.isCurrentUser(row) || row.deleted || row.role === role) {
      return;
    }

    let superAdminPassword: string | undefined;
    const demotingAdmin = row.role === 'ADMIN' && role !== 'ADMIN';
    if (demotingAdmin) {
      superAdminPassword = await this.openSuperAdminPasswordDialog(
        'pages.adminUsers.roleDemoteAdminConfirm'
      );
      if (!superAdminPassword) {
        await this.revertRoleSelectUi();
        return;
      }
    } else {
      const confirmed = await this.openConfirmDialog('pages.adminUsers.roleChangeConfirm');
      if (!confirmed) {
        await this.revertRoleSelectUi();
        return;
      }
    }

    await this.runAction(
      row.id,
      async () => {
        await this.usersApi.updateRole(row.id, {
          role,
          ...(superAdminPassword ? { superAdminPassword } : {})
        });
        this.notify('pages.adminUsers.roleUpdated');
      },
      'pages.adminUsers.roleUpdateFailed',
      { revertRoleSelectOnError: true }
    );
  }

  async onActiveToggle(row: UserAdminContractDto, active: boolean): Promise<void> {
    if (this.isCurrentUser(row) || row.deleted || row.active === active) {
      return;
    }
    if (!active) {
      const confirmed = await this.openConfirmDialog('pages.adminUsers.deactivateConfirm');
      if (!confirmed) {
        await this.reload();
        return;
      }
    }
    await this.runAction(row.id, async () => {
      await this.usersApi.setActive(row.id, { active });
      this.notify(
        active ? 'pages.adminUsers.activated' : 'pages.adminUsers.deactivated'
      );
    }, 'pages.adminUsers.activeUpdateFailed');
  }

  async onSoftDelete(row: UserAdminContractDto): Promise<void> {
    if (this.isCurrentUser(row) || row.deleted) {
      return;
    }
    const confirmed = await this.openConfirmDialog('pages.adminUsers.deleteConfirm');
    if (!confirmed) {
      return;
    }
    await this.runAction(row.id, async () => {
      await this.usersApi.softDelete(row.id);
      this.notify('pages.adminUsers.deleteSuccess');
    }, 'pages.adminUsers.deleteFailed');
  }

  async onRestore(row: UserAdminContractDto): Promise<void> {
    if (!row.deleted || this.isUpdating(row.id)) {
      return;
    }
    const confirmed = await this.openConfirmDialog('pages.adminUsers.restoreConfirm');
    if (!confirmed) {
      return;
    }
    await this.runAction(row.id, async () => {
      await this.usersApi.restore(row.id);
      this.notify('pages.adminUsers.restoreSuccess');
    }, 'pages.adminUsers.restoreFailed');
  }

  formatDate(value: string | null | undefined): string {
    if (!value) {
      return '—';
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  }

  private async runAction(
    id: string,
    action: () => Promise<void>,
    errorKey: string,
    options?: { revertRoleSelectOnError?: boolean }
  ): Promise<void> {
    this.updatingIds.update((set) => new Set(set).add(id));
    try {
      await action();
      await this.reload();
    } catch (err: unknown) {
      this.notify(this.mapErrorKey(err, errorKey), 'error');
      if (options?.revertRoleSelectOnError) {
        await this.revertRoleSelectUi();
      }
    } finally {
      this.updatingIds.update((set) => {
        const next = new Set(set);
        next.delete(id);
        return next;
      });
    }
  }

  /** Повертає select ролі до значення з сервера (mat-select інакше лишає обране). */
  private async revertRoleSelectUi(): Promise<void> {
    await this.reload();
    this.roleSelectEpoch.update((n) => n + 1);
  }

  private mapErrorKey(err: unknown, fallback: string): string {
    const code =
      err &&
      typeof err === 'object' &&
      'error' in err &&
      err.error &&
      typeof err.error === 'object' &&
      'code' in err.error
        ? String((err.error as { code?: string }).code ?? '')
        : '';
    if (code === 'SELF_OPERATION_FORBIDDEN') {
      return 'pages.adminUsers.selfOperationForbidden';
    }
    if (code === 'LAST_ADMIN_PROTECTED') {
      return 'pages.adminUsers.lastAdminProtected';
    }
    if (code === 'USER_DELETED') {
      return 'pages.adminUsers.userDeleted';
    }
    if (code === 'EMAIL_ALREADY_EXISTS') {
      return 'pages.adminUsers.emailAlreadyExists';
    }
    if (code === 'SUPER_ADMIN_PASSWORD_REQUIRED') {
      return 'pages.adminUsers.superAdminPasswordRequired';
    }
    if (code === 'INVALID_SUPER_ADMIN_PASSWORD') {
      return 'pages.adminUsers.invalidSuperAdminPassword';
    }
    if (code === 'SUPER_ADMIN_PASSWORD_NOT_CONFIGURED') {
      return 'pages.adminUsers.superAdminPasswordNotConfigured';
    }
    return fallback;
  }

  private notify(messageKey: string, kind: 'success' | 'error' = 'success'): void {
    showAppSnack(this.snackBar, this.translate, messageKey, kind);
  }

  private openConfirmDialog(messageKey: string): Promise<boolean> {
    const ref = this.dialog.open(
      ConfirmDialogComponent,
      getHandsetFriendlyDialogConfig({
        data: { messageKey }
      })
    );
    return firstValueFrom(ref.afterClosed()).then((result) => Boolean(result));
  }

  private openSuperAdminPasswordDialog(messageKey: string): Promise<string | undefined> {
    const ref = this.dialog.open(
      SuperAdminPasswordDialogComponent,
      getHandsetFriendlyDialogConfig({
        width: 'min(420px, calc(100vw - 24px))',
        data: { messageKey }
      })
    );
    return firstValueFrom(ref.afterClosed()).then((result) =>
      typeof result === 'string' && result.trim() ? result : undefined
    );
  }
}
