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
import { TranslateModule } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { firstValueFrom } from 'rxjs';
import {
  RegistrationScanSideContract,
  VehicleContractDto,
  VehicleListViewContract,
  VehicleTypeContract,
  VehiclesApiService
} from '../../core/api';
import { LayoutService } from '../../core/layout';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-admin-vehicles',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatSelectModule,
    MatTableModule,
    MatTooltipModule
  ],
  templateUrl: './admin-vehicles.component.html',
  styleUrl: './admin-vehicles.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminVehiclesComponent {
  private static readonly DESKTOP_PAGE_SIZE = 10;
  private static readonly HANDSET_PAGE_SIZE = 5;

  private readonly vehiclesApi = inject(VehiclesApiService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly dialog = inject(MatDialog);
  private readonly layout = inject(LayoutService);

  readonly vehicleTypeOptions: VehicleTypeContract[] = ['SEMI_TRACTOR', 'SEMI_TRAILER'];
  readonly scanSides: RegistrationScanSideContract[] = ['front', 'back'];
  readonly displayedColumns = [
    'plateNumber',
    'makeModel',
    'vehicleType',
    'owner',
    'status',
    'actions'
  ];
  readonly pageSizeOptions = [5, 10, 25, 50];

  readonly isLoading = signal(false);
  readonly loadError = signal('');
  readonly actionError = signal('');
  readonly actionSuccess = signal('');
  readonly vehicles = signal<VehicleContractDto[]>([]);
  readonly listView = signal<VehicleListViewContract>('active');
  readonly editingId = signal<string | null>(null);
  readonly selected = signal<VehicleContractDto | null>(null);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(AdminVehiclesComponent.DESKTOP_PAGE_SIZE);
  readonly scanBusy = signal(false);

  readonly pagedVehicles = computed(() => {
    const all = this.vehicles();
    const start = this.pageIndex() * this.pageSize();
    return all.slice(start, start + this.pageSize());
  });

  readonly form = this.formBuilder.nonNullable.group({
    plateNumber: ['', [Validators.required, Validators.maxLength(32)]],
    vin: ['', [Validators.required, Validators.minLength(17), Validators.maxLength(17)]],
    make: ['', [Validators.required, Validators.maxLength(64)]],
    model: ['', [Validators.required, Validators.maxLength(64)]],
    manufactureYear: [
      new Date().getFullYear(),
      [Validators.required, Validators.min(1950), Validators.max(new Date().getFullYear() + 1)]
    ],
    owner: ['', [Validators.required, Validators.maxLength(255)]],
    registrationSeries: ['', [Validators.required, Validators.maxLength(16)]],
    registrationNumber: ['', [Validators.required, Validators.maxLength(32)]],
    vehicleType: ['SEMI_TRACTOR' as VehicleTypeContract, Validators.required]
  });

  constructor() {
    effect(() => {
      this.layout.isHandset();
      this.pageSize.set(
        this.layout.handsetPageSize(
          AdminVehiclesComponent.DESKTOP_PAGE_SIZE,
          AdminVehiclesComponent.HANDSET_PAGE_SIZE
        )
      );
    });
    void this.reload();
  }

  async reload(): Promise<void> {
    this.isLoading.set(true);
    this.loadError.set('');
    try {
      const list = await this.vehiclesApi.list(this.listView());
      this.vehicles.set(list);
      const selectedId = this.selected()?.id;
      if (selectedId) {
        const refreshed = list.find((v) => v.id === selectedId) ?? null;
        this.selected.set(refreshed);
        if (refreshed && !refreshed.deleted) {
          this.patchForm(refreshed);
        }
      }
      const maxPage = Math.max(0, Math.ceil(list.length / this.pageSize()) - 1);
      if (this.pageIndex() > maxPage) {
        this.pageIndex.set(maxPage);
      }
    } catch {
      this.loadError.set('pages.adminVehicles.loadFailed');
    } finally {
      this.isLoading.set(false);
    }
  }

  onViewChange(view: VehicleListViewContract): void {
    this.listView.set(view);
    this.pageIndex.set(0);
    void this.reload();
  }

  onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }

  startCreate(): void {
    this.editingId.set(null);
    this.selected.set(null);
    this.form.reset({
      plateNumber: '',
      vin: '',
      make: '',
      model: '',
      manufactureYear: new Date().getFullYear(),
      owner: '',
      registrationSeries: '',
      registrationNumber: '',
      vehicleType: 'SEMI_TRACTOR'
    });
    this.form.enable();
    this.actionError.set('');
    this.actionSuccess.set('');
  }

  startEdit(row: VehicleContractDto): void {
    this.editingId.set(row.id);
    this.selected.set(row);
    this.patchForm(row);
    if (row.deleted) {
      this.form.disable();
    } else {
      this.form.enable();
    }
    this.actionError.set('');
    this.actionSuccess.set('');
  }

  async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const payload = {
      plateNumber: raw.plateNumber.trim(),
      vin: raw.vin.trim().toUpperCase(),
      make: raw.make.trim(),
      model: raw.model.trim(),
      manufactureYear: Number(raw.manufactureYear),
      owner: raw.owner.trim(),
      registrationSeries: raw.registrationSeries.trim(),
      registrationNumber: raw.registrationNumber.trim(),
      vehicleType: raw.vehicleType
    };
    this.actionError.set('');
    this.actionSuccess.set('');
    try {
      const id = this.editingId();
      const saved = id
        ? await this.vehiclesApi.update(id, payload)
        : await this.vehiclesApi.create(payload);
      this.actionSuccess.set(
        id ? 'pages.adminVehicles.updateSuccess' : 'pages.adminVehicles.createSuccess'
      );
      this.editingId.set(saved.id);
      this.selected.set(saved);
      this.patchForm(saved);
      await this.reload();
    } catch (err) {
      this.actionError.set(this.mapError(err, 'pages.adminVehicles.saveFailed'));
    }
  }

  async softDelete(row: VehicleContractDto): Promise<void> {
    const ok = await firstValueFrom(
      this.dialog
        .open(ConfirmDialogComponent, {
          data: { messageKey: 'pages.adminVehicles.deleteConfirm' }
        })
        .afterClosed()
    );
    if (!ok) {
      return;
    }
    try {
      await this.vehiclesApi.softDelete(row.id);
      this.actionSuccess.set('pages.adminVehicles.deleteSuccess');
      if (this.editingId() === row.id) {
        this.startCreate();
      }
      await this.reload();
    } catch {
      this.actionError.set('pages.adminVehicles.deleteFailed');
    }
  }

  async restore(row: VehicleContractDto): Promise<void> {
    const ok = await firstValueFrom(
      this.dialog
        .open(ConfirmDialogComponent, {
          data: { messageKey: 'pages.adminVehicles.restoreConfirm' }
        })
        .afterClosed()
    );
    if (!ok) {
      return;
    }
    try {
      const restored = await this.vehiclesApi.restore(row.id);
      this.actionSuccess.set('pages.adminVehicles.restoreSuccess');
      this.startEdit(restored);
      await this.reload();
    } catch (err) {
      this.actionError.set(this.mapError(err, 'pages.adminVehicles.restoreFailed'));
    }
  }

  onScanSelected(side: RegistrationScanSideContract, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    void this.uploadScan(side, file);
  }

  async uploadScan(side: RegistrationScanSideContract, file: File): Promise<void> {
    const id = this.selected()?.id;
    if (!id || this.selected()?.deleted) {
      return;
    }
    this.scanBusy.set(true);
    this.actionError.set('');
    try {
      await this.vehiclesApi.uploadScan(id, side, file);
      this.actionSuccess.set('pages.adminVehicles.scanUploadSuccess');
      const refreshed = await this.vehiclesApi.getById(id);
      this.selected.set(refreshed);
      await this.reload();
    } catch (err) {
      this.actionError.set(this.mapError(err, 'pages.adminVehicles.scanUploadFailed'));
    } finally {
      this.scanBusy.set(false);
    }
  }

  async openScan(side: RegistrationScanSideContract): Promise<void> {
    const row = this.selected();
    if (!row) {
      return;
    }
    try {
      const blob = await this.vehiclesApi.downloadScanBlob(row.id, side);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      this.actionError.set('pages.adminVehicles.scanOpenFailed');
    }
  }

  async deleteScan(side: RegistrationScanSideContract): Promise<void> {
    const row = this.selected();
    if (!row || row.deleted) {
      return;
    }
    const ok = await firstValueFrom(
      this.dialog
        .open(ConfirmDialogComponent, {
          data: { messageKey: 'pages.adminVehicles.scanDeleteConfirm' }
        })
        .afterClosed()
    );
    if (!ok) {
      return;
    }
    try {
      await this.vehiclesApi.deleteScan(row.id, side);
      this.actionSuccess.set('pages.adminVehicles.scanDeleteSuccess');
      const refreshed = await this.vehiclesApi.getById(row.id);
      this.selected.set(refreshed);
      await this.reload();
    } catch {
      this.actionError.set('pages.adminVehicles.scanDeleteFailed');
    }
  }

  typeLabelKey(type: VehicleTypeContract): string {
    return `pages.adminVehicles.types.${type}`;
  }

  private patchForm(row: VehicleContractDto): void {
    this.form.patchValue({
      plateNumber: row.plateNumber,
      vin: row.vin,
      make: row.make,
      model: row.model,
      manufactureYear: row.manufactureYear,
      owner: row.owner,
      registrationSeries: row.registrationSeries,
      registrationNumber: row.registrationNumber,
      vehicleType: row.vehicleType
    });
  }

  private mapError(err: unknown, fallback: string): string {
    const code = (err as { error?: { code?: string } })?.error?.code;
    switch (code) {
      case 'PLATE_ALREADY_EXISTS':
        return 'pages.adminVehicles.plateExists';
      case 'VIN_ALREADY_EXISTS':
        return 'pages.adminVehicles.vinExists';
      case 'REGISTRATION_ALREADY_EXISTS':
        return 'pages.adminVehicles.registrationExists';
      case 'VEHICLE_DELETED':
        return 'pages.adminVehicles.vehicleDeleted';
      default:
        return fallback;
    }
  }
}
