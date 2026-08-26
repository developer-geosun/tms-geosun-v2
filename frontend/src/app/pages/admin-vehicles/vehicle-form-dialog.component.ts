import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import {
  RegistrationScanSideContract,
  VehicleContractDto,
  VehicleTypeContract,
  VehiclesApiService
} from '../../core/api';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import {
  sanitizeUaPlateInput,
  UA_PLATE_MAX_LENGTH,
  UA_PLATE_PATTERN
} from './vehicle-plate.util';
import { showVehicleSnack } from './vehicle-snackbar';
import { sanitizeVinInput, VIN_MAX_LENGTH, VIN_PATTERN } from './vehicle-vin.util';

export interface VehicleFormDialogData {
  vehicle: VehicleContractDto | null;
  /** Унікальні марки з уже зареєстрованих ТЗ (для autocomplete). */
  makeOptions: readonly string[];
}

@Component({
  selector: 'app-vehicle-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    TranslateModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule
  ],
  templateUrl: './vehicle-form-dialog.component.html',
  styleUrl: './vehicle-form-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VehicleFormDialogComponent {
  private readonly data = inject<VehicleFormDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<VehicleFormDialogComponent, boolean>);
  private readonly formBuilder = inject(FormBuilder);
  private readonly vehiclesApi = inject(VehiclesApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);

  readonly vehicleTypeOptions: VehicleTypeContract[] = ['SEMI_TRACTOR', 'SEMI_TRAILER'];
  readonly scanSides: RegistrationScanSideContract[] = ['front', 'back'];
  readonly plateMaxLength = UA_PLATE_MAX_LENGTH;
  readonly vinMaxLength = VIN_MAX_LENGTH;

  readonly vehicle = signal<VehicleContractDto | null>(this.data.vehicle);
  readonly scanBusy = signal(false);
  readonly saving = signal(false);
  /** Чи були зміни, щоб батьківська сторінка перезавантажила список. */
  private readonly changed = signal(false);

  readonly isCreate = computed(() => this.vehicle() == null);
  readonly isDeleted = computed(() => this.vehicle()?.deleted === true);
  readonly titleKey = computed(() =>
    this.isCreate() ? 'pages.adminVehicles.createTitle' : 'pages.adminVehicles.editTitle'
  );

  readonly form = this.formBuilder.nonNullable.group({
    plateNumber: [
      '',
      [
        Validators.required,
        Validators.pattern(UA_PLATE_PATTERN),
        Validators.maxLength(UA_PLATE_MAX_LENGTH)
      ]
    ],
    vin: [
      '',
      [Validators.required, Validators.pattern(VIN_PATTERN), Validators.maxLength(VIN_MAX_LENGTH)]
    ],
    make: ['', [Validators.required, Validators.maxLength(64)]],
    model: ['', [Validators.required, Validators.maxLength(64)]],
    manufactureYear: [
      null as unknown as number,
      [Validators.required, Validators.min(1950), Validators.max(new Date().getFullYear() + 1)]
    ],
    owner: ['', [Validators.required, Validators.maxLength(255)]],
    registrationSeries: ['', [Validators.required, Validators.maxLength(16)]],
    registrationNumber: ['', [Validators.required, Validators.maxLength(32)]],
    vehicleType: [null as VehicleTypeContract | null, Validators.required]
  });

  private readonly makeQuery = toSignal(this.form.controls.make.valueChanges, {
    initialValue: this.form.controls.make.value
  });

  /** Підказки марок: усі або відфільтровані за введеним текстом. */
  readonly filteredMakes = computed(() => {
    const query = this.makeQuery().trim().toLocaleUpperCase('uk-UA');
    const options = this.data.makeOptions ?? [];
    if (!query) {
      return [...options];
    }
    return options.filter((make) => make.toLocaleUpperCase('uk-UA').includes(query));
  });

  constructor() {
    const existing = this.data.vehicle;
    if (existing) {
      this.patchForm(existing);
      if (existing.deleted) {
        this.form.disable();
      }
    }
  }

  close(): void {
    this.dialogRef.close(this.changed());
  }

  onPlateNumberInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const sanitized = sanitizeUaPlateInput(input.value);
    if (input.value !== sanitized) {
      input.value = sanitized;
    }
    this.form.controls.plateNumber.setValue(sanitized, { emitEvent: false });
    this.form.controls.plateNumber.markAsDirty();
  }

  onVinInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const sanitized = sanitizeVinInput(input.value);
    if (input.value !== sanitized) {
      input.value = sanitized;
    }
    this.form.controls.vin.setValue(sanitized, { emitEvent: false });
    this.form.controls.vin.markAsDirty();
  }

  onMakeInput(event: Event): void {
    this.applyUppercaseInput('make', event);
  }

  onModelInput(event: Event): void {
    this.applyUppercaseInput('model', event);
  }

  onRegistrationSeriesInput(event: Event): void {
    this.applyUppercaseInput('registrationSeries', event);
  }

  onRegistrationNumberInput(event: Event): void {
    this.applyUppercaseInput('registrationNumber', event);
  }

  async save(): Promise<void> {
    if (this.form.invalid || this.isDeleted() || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    if (!raw.vehicleType) {
      this.form.controls.vehicleType.markAsTouched();
      return;
    }
    const payload = {
      plateNumber: sanitizeUaPlateInput(raw.plateNumber),
      vin: sanitizeVinInput(raw.vin),
      make: raw.make.trim().toLocaleUpperCase('uk-UA'),
      model: raw.model.trim().toLocaleUpperCase('uk-UA'),
      manufactureYear: Number(raw.manufactureYear),
      owner: raw.owner.trim(),
      registrationSeries: raw.registrationSeries.trim().toLocaleUpperCase('uk-UA'),
      registrationNumber: raw.registrationNumber.trim().toLocaleUpperCase('uk-UA'),
      vehicleType: raw.vehicleType
    };
    this.saving.set(true);
    try {
      const id = this.vehicle()?.id;
      if (id) {
        await this.vehiclesApi.update(id, payload);
      } else {
        await this.vehiclesApi.create(payload);
      }
      this.changed.set(true);
      this.notify(
        id ? 'pages.adminVehicles.updateSuccess' : 'pages.adminVehicles.createSuccess'
      );
      this.dialogRef.close(true);
    } catch (err) {
      this.notify(this.mapError(err, 'pages.adminVehicles.saveFailed'), 'error');
    } finally {
      this.saving.set(false);
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
    const id = this.vehicle()?.id;
    if (!id || this.isDeleted()) {
      return;
    }
    this.scanBusy.set(true);
    try {
      await this.vehiclesApi.uploadScan(id, side, file);
      this.changed.set(true);
      this.notify('pages.adminVehicles.scanUploadSuccess');
      this.vehicle.set(await this.vehiclesApi.getById(id));
    } catch (err) {
      this.notify(this.mapError(err, 'pages.adminVehicles.scanUploadFailed'), 'error');
    } finally {
      this.scanBusy.set(false);
    }
  }

  async openScan(side: RegistrationScanSideContract): Promise<void> {
    const row = this.vehicle();
    if (!row) {
      return;
    }
    try {
      const blob = await this.vehiclesApi.downloadScanBlob(row.id, side);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      this.notify('pages.adminVehicles.scanOpenFailed', 'error');
    }
  }

  async deleteScan(side: RegistrationScanSideContract): Promise<void> {
    const row = this.vehicle();
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
      this.changed.set(true);
      this.notify('pages.adminVehicles.scanDeleteSuccess');
      this.vehicle.set(await this.vehiclesApi.getById(row.id));
    } catch {
      this.notify('pages.adminVehicles.scanDeleteFailed', 'error');
    }
  }

  typeLabelKey(type: VehicleTypeContract): string {
    return `pages.adminVehicles.types.${type}`;
  }

  private patchForm(row: VehicleContractDto): void {
    this.form.patchValue({
      plateNumber: sanitizeUaPlateInput(row.plateNumber),
      vin: sanitizeVinInput(row.vin),
      make: row.make.toLocaleUpperCase('uk-UA'),
      model: row.model.toLocaleUpperCase('uk-UA'),
      manufactureYear: row.manufactureYear,
      owner: row.owner,
      registrationSeries: row.registrationSeries.toLocaleUpperCase('uk-UA'),
      registrationNumber: row.registrationNumber.toLocaleUpperCase('uk-UA'),
      vehicleType: row.vehicleType
    });
  }

  private notify(messageKey: string, kind: 'success' | 'error' = 'success'): void {
    showVehicleSnack(this.snackBar, this.translate, messageKey, kind);
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

  private applyUppercaseInput(
    controlName: 'make' | 'model' | 'registrationSeries' | 'registrationNumber',
    event: Event
  ): void {
    const input = event.target as HTMLInputElement;
    const upper = input.value.toLocaleUpperCase('uk-UA');
    if (input.value !== upper) {
      input.value = upper;
    }
    // Для марки emit потрібен, щоб оновлювався список autocomplete.
    this.form.controls[controlName].setValue(upper, {
      emitEvent: controlName === 'make'
    });
    this.form.controls[controlName].markAsDirty();
  }
}
