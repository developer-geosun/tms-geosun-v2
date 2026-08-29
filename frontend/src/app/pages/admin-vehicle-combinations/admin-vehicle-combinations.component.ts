import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { firstValueFrom } from 'rxjs';
import {
  CreateVehicleCombinationContractRequest,
  VehicleCombinationContractDto,
  VehicleCombinationListViewContract,
  VehicleCombinationsApiService,
  VehicleContractDto,
  VehiclesApiService
} from '../../core/api';
import { LayoutService } from '../../core/layout';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { getHandsetFriendlyDialogConfig } from '../../shared/utils/handset-friendly-dialog-config';
import { showAppSnack } from '../../shared/utils/app-snackbar';

type CombinationsDisplayMode = 'table' | 'cards';

export interface VehicleCombinationFormDialogData {
  combination: VehicleCombinationContractDto | null;
  tractors: VehicleContractDto[];
  trailers: VehicleContractDto[];
}

@Component({
  selector: 'app-vehicle-combination-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    TranslateModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule
  ],
  template: `
    <h2 mat-dialog-title>
      {{
        (data.combination
          ? 'pages.adminVehicleCombinations.editTitle'
          : 'pages.adminVehicleCombinations.createTitle'
        ) | translate
      }}
    </h2>
    <mat-dialog-content>
      <form class="combination-form" [formGroup]="form" (ngSubmit)="save()">
        <mat-form-field appearance="outline">
          <mat-label>{{ 'pages.adminVehicleCombinations.name' | translate }}</mat-label>
          <input matInput formControlName="name" maxlength="128" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>{{ 'pages.adminVehicleCombinations.tractor' | translate }}</mat-label>
          <mat-select formControlName="tractorId">
            @for (v of data.tractors; track v.id) {
              <mat-option [value]="v.id">{{ v.plateNumber }} — {{ v.make }} {{ v.model }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>{{ 'pages.adminVehicleCombinations.trailer' | translate }}</mat-label>
          <mat-select formControlName="trailerId">
            @for (v of data.trailers; track v.id) {
              <mat-option [value]="v.id">{{ v.plateNumber }} — {{ v.make }} {{ v.model }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </form>
      @if (errorKey()) {
        <p class="combination-form__error">{{ errorKey() | translate }}</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" (click)="close()" [disabled]="saving()">
        {{ 'pages.adminVehicleCombinations.cancel' | translate }}
      </button>
      <button
        mat-flat-button
        color="primary"
        type="button"
        (click)="save()"
        [disabled]="form.invalid || saving()">
        {{ 'pages.adminVehicleCombinations.save' | translate }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .combination-form {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      min-width: min(100%, 22rem);
      padding-top: 0.25rem;
    }
    .combination-form__error {
      color: var(--mat-sys-error, #b3261e);
      margin: 0.5rem 0 0;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VehicleCombinationFormDialogComponent {
  readonly data = inject<VehicleCombinationFormDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<VehicleCombinationFormDialogComponent, boolean>);
  private readonly formBuilder = inject(FormBuilder);
  private readonly combinationsApi = inject(VehicleCombinationsApiService);

  readonly saving = signal(false);
  readonly errorKey = signal('');

  readonly form = this.formBuilder.nonNullable.group({
    name: [this.data.combination?.name ?? ''],
    tractorId: [this.data.combination?.tractorId ?? '', Validators.required],
    trailerId: [this.data.combination?.trailerId ?? '', Validators.required]
  });

  close(): void {
    this.dialogRef.close(false);
  }

  async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const payload: CreateVehicleCombinationContractRequest = {
      name: raw.name.trim() || null,
      tractorId: raw.tractorId,
      trailerId: raw.trailerId
    };
    this.saving.set(true);
    this.errorKey.set('');
    try {
      const existing = this.data.combination;
      if (existing) {
        await this.combinationsApi.update(existing.id, payload);
      } else {
        await this.combinationsApi.create(payload);
      }
      this.dialogRef.close(true);
    } catch {
      this.errorKey.set('pages.adminVehicleCombinations.saveFailed');
    } finally {
      this.saving.set(false);
    }
  }
}

@Component({
  selector: 'app-admin-vehicle-combinations',
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
  templateUrl: './admin-vehicle-combinations.component.html',
  styleUrl: './admin-vehicle-combinations.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminVehicleCombinationsComponent {
  private static readonly DESKTOP_PAGE_SIZE = 10;
  private static readonly HANDSET_PAGE_SIZE = 5;

  private readonly combinationsApi = inject(VehicleCombinationsApiService);
  private readonly vehiclesApi = inject(VehiclesApiService);
  private readonly dialog = inject(MatDialog);
  private readonly layout = inject(LayoutService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);

  readonly isHandset = this.layout.isHandset;
  readonly displayedColumns = ['name', 'tractor', 'trailer', 'status', 'actions'];
  readonly pageSizeOptions = [5, 10, 25, 50];

  readonly isLoading = signal(false);
  readonly loadError = signal('');
  /** Повний список (view=all) для лічильників і клієнтського фільтра. */
  readonly allCombinations = signal<VehicleCombinationContractDto[]>([]);
  readonly tractors = signal<VehicleContractDto[]>([]);
  readonly trailers = signal<VehicleContractDto[]>([]);
  readonly listView = signal<VehicleCombinationListViewContract>('active');
  readonly pageIndex = signal(0);
  readonly pageSize = signal(AdminVehicleCombinationsComponent.DESKTOP_PAGE_SIZE);
  /** Ручний вибір на desktop; на handset завжди картки. */
  readonly preferredDisplayMode = signal<CombinationsDisplayMode>('table');

  readonly displayMode = computed<CombinationsDisplayMode>(() =>
    this.isHandset() ? 'cards' : this.preferredDisplayMode()
  );

  readonly countAll = computed(() => this.allCombinations().length);
  readonly countActive = computed(
    () => this.allCombinations().filter((c) => !c.deleted).length
  );
  readonly countDeleted = computed(
    () => this.allCombinations().filter((c) => c.deleted).length
  );

  readonly combinations = computed(() => {
    const all = this.allCombinations();
    switch (this.listView()) {
      case 'active':
        return all.filter((c) => !c.deleted);
      case 'deleted':
        return all.filter((c) => c.deleted);
      default:
        return all;
    }
  });

  readonly pagedCombinations = computed(() => {
    const filtered = this.combinations();
    const start = this.pageIndex() * this.pageSize();
    return filtered.slice(start, start + this.pageSize());
  });

  constructor() {
    effect(() => {
      this.layout.isHandset();
      this.pageSize.set(
        this.layout.handsetPageSize(
          AdminVehicleCombinationsComponent.DESKTOP_PAGE_SIZE,
          AdminVehicleCombinationsComponent.HANDSET_PAGE_SIZE
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
      const [list, vehicles] = await Promise.all([
        this.combinationsApi.list('all'),
        this.vehiclesApi.list('active')
      ]);
      this.allCombinations.set(list);
      this.tractors.set(vehicles.filter((v) => v.vehicleType === 'SEMI_TRACTOR'));
      this.trailers.set(vehicles.filter((v) => v.vehicleType === 'SEMI_TRAILER'));
      this.clampPageIndex();
    } catch {
      this.loadError.set('pages.adminVehicleCombinations.loadFailed');
      this.notify('pages.adminVehicleCombinations.loadFailed', 'error');
    } finally {
      this.isLoading.set(false);
    }
  }

  onViewChange(view: VehicleCombinationListViewContract | undefined): void {
    if (!view) {
      return;
    }
    this.listView.set(view);
    this.pageIndex.set(0);
  }

  onDisplayModeChange(mode: CombinationsDisplayMode | undefined): void {
    if (!mode) {
      return;
    }
    this.preferredDisplayMode.set(mode);
  }

  onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }

  async openCreate(): Promise<void> {
    await this.openFormDialog(null);
  }

  async openEdit(row: VehicleCombinationContractDto): Promise<void> {
    await this.openFormDialog(row);
  }

  async softDelete(row: VehicleCombinationContractDto): Promise<void> {
    const ok = await firstValueFrom(
      this.dialog
        .open(ConfirmDialogComponent, {
          data: { messageKey: 'pages.adminVehicleCombinations.deleteConfirm' }
        })
        .afterClosed()
    );
    if (!ok) {
      return;
    }
    try {
      await this.combinationsApi.softDelete(row.id);
      this.notify('pages.adminVehicleCombinations.deleteSuccess');
      await this.reload();
    } catch {
      this.notify('pages.adminVehicleCombinations.deleteFailed', 'error');
    }
  }

  async restore(row: VehicleCombinationContractDto): Promise<void> {
    const ok = await firstValueFrom(
      this.dialog
        .open(ConfirmDialogComponent, {
          data: { messageKey: 'pages.adminVehicleCombinations.restoreConfirm' }
        })
        .afterClosed()
    );
    if (!ok) {
      return;
    }
    try {
      await this.combinationsApi.restore(row.id);
      this.notify('pages.adminVehicleCombinations.restoreSuccess');
      await this.reload();
    } catch {
      this.notify('pages.adminVehicleCombinations.restoreFailed', 'error');
    }
  }

  displayName(row: VehicleCombinationContractDto): string {
    return row.name?.trim() || '—';
  }

  private async openFormDialog(combination: VehicleCombinationContractDto | null): Promise<void> {
    const ref = this.dialog.open(
      VehicleCombinationFormDialogComponent,
      getHandsetFriendlyDialogConfig({
        width: 'min(480px, calc(100vw - 24px))',
        data: {
          combination,
          tractors: this.tractors(),
          trailers: this.trailers()
        } satisfies VehicleCombinationFormDialogData
      })
    );
    const saved = await firstValueFrom(ref.afterClosed());
    if (saved) {
      this.notify(
        combination
          ? 'pages.adminVehicleCombinations.updateSuccess'
          : 'pages.adminVehicleCombinations.createSuccess'
      );
      await this.reload();
    }
  }

  private clampPageIndex(): void {
    const maxPage = Math.max(0, Math.ceil(this.combinations().length / this.pageSize()) - 1);
    if (this.pageIndex() > maxPage) {
      this.pageIndex.set(maxPage);
    }
  }

  private notify(messageKey: string, kind: 'success' | 'error' = 'success'): void {
    showAppSnack(this.snackBar, this.translate, messageKey, kind);
  }
}
