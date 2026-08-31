import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  inject,
  signal
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_NATIVE_DATE_FORMATS, provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatStepperModule } from '@angular/material/stepper';
import { MatTooltipModule } from '@angular/material/tooltip';
import { firstValueFrom } from 'rxjs';
import {
  RegistrationScanSideContract,
  StoredFileContractDto,
  VehicleContractDto,
  VehicleDocumentGroupContractDto,
  VehicleDocumentStatusContract,
  VehicleDocumentTypeContract,
  VehicleTypeContract,
  VehiclesApiService
} from '../../core/api';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { getHandsetFriendlyDialogConfig } from '../../shared/utils/handset-friendly-dialog-config';
import {
  sanitizeUaPlateInput,
  UA_PLATE_MAX_LENGTH,
  UA_PLATE_PATTERN
} from './vehicle-plate.util';
import {
  VehicleScanViewerDialogComponent,
  VehicleScanViewerDialogResult
} from './vehicle-scan-viewer-dialog.component';
import { showAppSnack } from '../../shared/utils/app-snackbar';
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
    MatCheckboxModule,
    MatDatepickerModule,
    MatDialogModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    MatStepperModule,
    MatTooltipModule
  ],
  providers: [
    provideNativeDateAdapter({
      parse: MAT_NATIVE_DATE_FORMATS.parse,
      display: {
        ...MAT_NATIVE_DATE_FORMATS.display,
        dateInput: { year: 'numeric', month: '2-digit', day: '2-digit' }
      }
    })
  ],
  templateUrl: './vehicle-form-dialog.component.html',
  styleUrl: './vehicle-form-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VehicleFormDialogComponent implements OnDestroy {
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
  readonly documentGroups = signal<VehicleDocumentGroupContractDto[]>([]);
  readonly documentsLoading = signal(false);
  readonly documentBusy = signal(false);
  readonly scanBusy = signal(false);
  readonly saving = signal(false);
  /** blob: URL мініатюр сканів за стороною. */
  readonly scanPreviewUrls = signal<ReadonlyMap<RegistrationScanSideContract, string>>(new Map());
  private previewLoadEpoch = 0;
  /** Активний крок: 0 — дані, 1 — скани, 2 — документи. */
  readonly stepIndex = signal(0);
  /** Тип документа, для якого відкрита форма додавання версії. */
  readonly addFormType = signal<VehicleDocumentTypeContract | null>(null);
  readonly addValidFrom = signal<Date | null>(null);
  readonly addValidTo = signal<Date | null>(null);
  readonly addFile = signal<File | null>(null);
  /** Чи були зміни, щоб батьківська сторінка перезавантажила список. */
  private readonly changed = signal(false);

  readonly isCreate = computed(() => this.vehicle() == null);
  readonly isDeleted = computed(() => this.vehicle()?.deleted === true);
  /** Заголовок: при редагуванні — з поточним держномером. */
  readonly dialogTitle = computed(() => {
    if (this.isCreate()) {
      return this.translate.instant('pages.adminVehicles.createTitle');
    }
    const plate = this.vehicle()?.plateNumber?.trim() || '';
    const base = this.translate.instant('pages.adminVehicles.editTitle');
    return plate ? `${base} · ${plate}` : base;
  });
  readonly onDataStep = computed(() => this.stepIndex() === 0);
  readonly onScansStep = computed(() => this.stepIndex() === 1);
  readonly onDocumentsStep = computed(() => this.stepIndex() === 2);

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
    vehicleType: [null as VehicleTypeContract | null, Validators.required],
    hasRefrigerator: [false]
  });

  private readonly makeQuery = toSignal(this.form.controls.make.valueChanges, {
    initialValue: this.form.controls.make.value
  });

  private readonly vehicleTypeValue = toSignal(this.form.controls.vehicleType.valueChanges, {
    initialValue: this.form.controls.vehicleType.value
  });

  readonly showRefrigerator = computed(() => this.vehicleTypeValue() === 'SEMI_TRAILER');

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
      void this.reloadDocuments();
      void this.reloadScanPreviews();
    }
  }

  ngOnDestroy(): void {
    this.revokeAllScanPreviews();
  }

  close(): void {
    this.dialogRef.close(this.changed());
  }

  onStepChange(index: number): void {
    this.stepIndex.set(index);
    if (index === 1 && this.vehicle()?.id) {
      void this.reloadScanPreviews();
    }
    if (index === 2 && this.vehicle()?.id) {
      void this.reloadDocuments();
    }
  }

  goNext(): void {
    this.onStepChange(Math.min(2, this.stepIndex() + 1));
  }

  goPrev(): void {
    this.onStepChange(Math.max(0, this.stepIndex() - 1));
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
      vehicleType: raw.vehicleType,
      hasRefrigerator: raw.vehicleType === 'SEMI_TRAILER' ? raw.hasRefrigerator : false
    };
    this.saving.set(true);
    try {
      const id = this.vehicle()?.id;
      if (id) {
        const updated = await this.vehiclesApi.update(id, payload);
        this.vehicle.set(updated);
        this.changed.set(true);
        this.notify('pages.adminVehicles.updateSuccess');
        await this.reloadDocuments();
      } else {
        const created = await this.vehiclesApi.create(payload);
        this.vehicle.set(created);
        this.patchForm(created);
        this.changed.set(true);
        this.notify('pages.adminVehicles.createSuccess');
        await this.reloadDocuments();
        // Після створення переходимо до сканів.
        this.stepIndex.set(1);
      }
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
      await this.reloadScanPreviews();
    } catch (err) {
      this.notify(this.mapError(err, 'pages.adminVehicles.scanUploadFailed'), 'error');
    } finally {
      this.scanBusy.set(false);
    }
  }

  async openScanViewer(side: RegistrationScanSideContract): Promise<void> {
    const row = this.vehicle();
    if (!row) {
      return;
    }
    const ref = this.dialog.open(
      VehicleScanViewerDialogComponent,
      getHandsetFriendlyDialogConfig({
        width: 'min(96vw, 1100px)',
        height: 'min(96vh, 900px)',
        maxWidth: '100vw',
        maxHeight: '100vh',
        panelClass: 'vehicle-scan-viewer-dialog-shell',
        data: {
          vehicleId: row.id,
          side,
          plateNumber: row.plateNumber,
          vehicleDeleted: row.deleted,
          file: this.scanFile(side)
        }
      })
    );
    const result = (await firstValueFrom(
      ref.afterClosed()
    )) as VehicleScanViewerDialogResult | undefined;
    if (!result?.changed) {
      return;
    }
    this.changed.set(true);
    this.vehicle.set(await this.vehiclesApi.getById(row.id));
    await this.reloadScanPreviews();
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
      await this.reloadScanPreviews();
    } catch {
      this.notify('pages.adminVehicles.scanDeleteFailed', 'error');
    }
  }

  scanFile(side: RegistrationScanSideContract): StoredFileContractDto | null {
    const row = this.vehicle();
    if (!row) {
      return null;
    }
    return side === 'front' ? row.scanFront : row.scanBack;
  }

  hasScan(side: RegistrationScanSideContract): boolean {
    return this.scanFile(side) != null;
  }

  isScanImage(file: StoredFileContractDto | null): boolean {
    const mime = (file?.contentType || '').toLowerCase();
    return mime === 'image/jpeg' || mime === 'image/png' || mime.startsWith('image/');
  }

  isScanPdf(file: StoredFileContractDto | null): boolean {
    return (file?.contentType || '').toLowerCase() === 'application/pdf';
  }

  scanPreviewUrl(side: RegistrationScanSideContract): string | null {
    return this.scanPreviewUrls().get(side) ?? null;
  }

  startAddDocument(type: VehicleDocumentTypeContract): void {
    this.addFormType.set(type);
    this.addValidFrom.set(null);
    this.addValidTo.set(null);
    this.addFile.set(null);
  }

  cancelAddDocument(): void {
    this.addFormType.set(null);
    this.addValidFrom.set(null);
    this.addValidTo.set(null);
    this.addFile.set(null);
  }

  onAddFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';
    this.addFile.set(file);
  }

  async submitAddDocument(): Promise<void> {
    const vehicleId = this.vehicle()?.id;
    const type = this.addFormType();
    const from = this.addValidFrom();
    const to = this.addValidTo();
    const file = this.addFile();
    if (!vehicleId || !type || !from || !to || !file || this.isDeleted()) {
      this.notify('pages.adminVehicles.documentAddIncomplete', 'error');
      return;
    }
    if (to.getTime() < from.getTime()) {
      this.notify('pages.adminVehicles.documentDatesInvalid', 'error');
      return;
    }
    this.documentBusy.set(true);
    try {
      await this.vehiclesApi.addDocument(
        vehicleId,
        type,
        this.toIsoDate(from),
        this.toIsoDate(to),
        file
      );
      this.changed.set(true);
      this.notify('pages.adminVehicles.documentAddSuccess');
      this.cancelAddDocument();
      await this.reloadDocuments();
      this.vehicle.set(await this.vehiclesApi.getById(vehicleId));
    } catch (err) {
      this.notify(this.mapError(err, 'pages.adminVehicles.documentAddFailed'), 'error');
    } finally {
      this.documentBusy.set(false);
    }
  }

  async openDocumentScan(documentId: string): Promise<void> {
    const vehicleId = this.vehicle()?.id;
    if (!vehicleId) {
      return;
    }
    try {
      const blob = await this.vehiclesApi.downloadDocumentScanBlob(vehicleId, documentId);
      this.openBlob(blob);
    } catch {
      this.notify('pages.adminVehicles.documentOpenFailed', 'error');
    }
  }

  async deleteDocumentVersion(documentId: string): Promise<void> {
    const vehicleId = this.vehicle()?.id;
    if (!vehicleId || this.isDeleted()) {
      return;
    }
    const ok = await firstValueFrom(
      this.dialog
        .open(ConfirmDialogComponent, {
          data: { messageKey: 'pages.adminVehicles.documentDeleteConfirm' }
        })
        .afterClosed()
    );
    if (!ok) {
      return;
    }
    this.documentBusy.set(true);
    try {
      await this.vehiclesApi.deleteDocument(vehicleId, documentId);
      this.changed.set(true);
      this.notify('pages.adminVehicles.documentDeleteSuccess');
      await this.reloadDocuments();
      this.vehicle.set(await this.vehiclesApi.getById(vehicleId));
    } catch {
      this.notify('pages.adminVehicles.documentDeleteFailed', 'error');
    } finally {
      this.documentBusy.set(false);
    }
  }

  typeLabelKey(type: VehicleTypeContract): string {
    return `pages.adminVehicles.types.${type}`;
  }

  documentTypeKey(type: VehicleDocumentTypeContract): string {
    return `pages.adminVehicles.documentTypes.${type}`;
  }

  documentStatusKey(status: VehicleDocumentStatusContract): string {
    return `pages.adminVehicles.documentStatuses.${status}`;
  }

  private async reloadDocuments(): Promise<void> {
    const id = this.vehicle()?.id;
    if (!id) {
      this.documentGroups.set([]);
      return;
    }
    this.documentsLoading.set(true);
    try {
      const response = await this.vehiclesApi.listDocuments(id);
      this.documentGroups.set(response.documents);
    } catch {
      this.notify('pages.adminVehicles.documentsLoadFailed', 'error');
    } finally {
      this.documentsLoading.set(false);
    }
  }

  private async reloadScanPreviews(): Promise<void> {
    const row = this.vehicle();
    this.revokeAllScanPreviews();
    if (!row?.id) {
      return;
    }
    const epoch = ++this.previewLoadEpoch;
    const loaded = new Map<RegistrationScanSideContract, string>();
    await Promise.all(
      this.scanSides.map(async (side) => {
        const file = side === 'front' ? row.scanFront : row.scanBack;
        if (!file || !this.isScanImage(file)) {
          return;
        }
        try {
          const blob = await this.vehiclesApi.downloadScanBlob(row.id, side);
          const url = URL.createObjectURL(blob);
          if (epoch !== this.previewLoadEpoch) {
            URL.revokeObjectURL(url);
            return;
          }
          loaded.set(side, url);
        } catch {
          // Прев’ю опційне.
        }
      })
    );
    if (epoch !== this.previewLoadEpoch) {
      for (const url of loaded.values()) {
        URL.revokeObjectURL(url);
      }
      return;
    }
    this.scanPreviewUrls.set(loaded);
  }

  private revokeAllScanPreviews(): void {
    this.previewLoadEpoch++;
    for (const url of this.scanPreviewUrls().values()) {
      URL.revokeObjectURL(url);
    }
    this.scanPreviewUrls.set(new Map());
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
      vehicleType: row.vehicleType,
      hasRefrigerator: row.hasRefrigerator
    });
  }

  private openBlob(blob: Blob): void {
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  private toIsoDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private notify(messageKey: string, kind: 'success' | 'error' = 'success'): void {
    showAppSnack(this.snackBar, this.translate, messageKey, kind);
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
      case 'DOCUMENT_TYPE_NOT_ALLOWED':
        return 'pages.adminVehicles.documentTypeNotAllowed';
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
