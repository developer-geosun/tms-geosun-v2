import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MAT_NATIVE_DATE_FORMATS, provideNativeDateAdapter } from '@angular/material/core';
import {
  MatDialog,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { firstValueFrom } from 'rxjs';
import {
  CreateTripContractRequest,
  DriverContractDto,
  DriversApiService,
  TripContractDto,
  TripExpenseCategoryContract,
  TripExpenseLineContractDto,
  TripExpenseLineInputContract,
  TripExpenseReportContractDto,
  TripStatusContract,
  TripsApiService,
  VehicleCombinationContractDto,
  VehicleCombinationsApiService,
  VehicleContractDto,
  VehiclesApiService
} from '../../core/api';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { showAppSnack } from '../../shared/utils/app-snackbar';
import { getHandsetFriendlyDialogConfig } from '../../shared/utils/handset-friendly-dialog-config';

type VehicleMode = 'combination' | 'manual';

interface EditableExpenseLine {
  id: string | null;
  category: TripExpenseCategoryContract;
  amount: string;
  currencyCode: string;
  expenseDate: string;
  description: string;
  storedFileId: string | null;
  receiptName: string | null;
}

@Component({
  selector: 'app-trip-reject-comment-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    TranslateModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule
  ],
  template: `
    <h2 mat-dialog-title>{{ 'pages.adminTrips.rejectTitle' | translate }}</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" class="reject-field">
        <mat-label>{{ 'pages.adminTrips.reviewComment' | translate }}</mat-label>
        <textarea matInput rows="3" [formControl]="commentCtrl"></textarea>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" (click)="dialogRef.close(null)">
        {{ 'pages.adminTrips.cancel' | translate }}
      </button>
      <button mat-flat-button color="warn" type="button" (click)="confirm()">
        {{ 'pages.adminTrips.reject' | translate }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .reject-field {
      width: 100%;
      min-width: min(100%, 20rem);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TripRejectCommentDialogComponent {
  readonly dialogRef = inject(MatDialogRef<TripRejectCommentDialogComponent, string | null>);
  private readonly formBuilder = inject(FormBuilder);
  readonly commentCtrl = this.formBuilder.nonNullable.control('');

  confirm(): void {
    this.dialogRef.close(this.commentCtrl.value.trim());
  }
}

@Component({
  selector: 'app-admin-trip-detail',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    TranslateModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatDatepickerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    MatTableModule,
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
  templateUrl: './admin-trip-detail.component.html',
  styleUrl: './admin-trip-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminTripDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);
  private readonly tripsApi = inject(TripsApiService);
  private readonly driversApi = inject(DriversApiService);
  private readonly combinationsApi = inject(VehicleCombinationsApiService);
  private readonly vehiclesApi = inject(VehiclesApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);

  readonly expenseCategories: TripExpenseCategoryContract[] = [
    'FUEL',
    'TOLL',
    'PER_DIEM',
    'PARKING',
    'REPAIR',
    'OTHER'
  ];
  readonly expenseColumns = [
    'category',
    'amount',
    'currency',
    'expenseDate',
    'description',
    'receipt',
    'actions'
  ];

  readonly isCreate = signal(true);
  readonly tripId = signal<string | null>(null);
  readonly trip = signal<TripContractDto | null>(null);
  readonly expenseReport = signal<TripExpenseReportContractDto | null>(null);
  readonly editableLines = signal<EditableExpenseLine[]>([]);
  readonly drivers = signal<DriverContractDto[]>([]);
  readonly combinations = signal<VehicleCombinationContractDto[]>([]);
  readonly tractors = signal<VehicleContractDto[]>([]);
  readonly trailers = signal<VehicleContractDto[]>([]);
  readonly vehicleMode = signal<VehicleMode>('combination');

  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly isExpenseBusy = signal(false);
  readonly loadError = signal('');

  readonly form = this.formBuilder.nonNullable.group({
    title: [''],
    comment: [''],
    originText: [''],
    destinationText: [''],
    plannedStartAt: [null as Date | null],
    plannedEndAt: [null as Date | null],
    driverId: [''],
    combinationId: [''],
    tractorId: [''],
    trailerId: [''],
    routeRequestId: ['']
  });

  readonly statusActions = computed(() => {
    const status = this.trip()?.status;
    if (!status) {
      return [] as TripStatusContract[];
    }
    switch (status) {
      case 'DRAFT':
        return ['PLANNED', 'CANCELLED'] as TripStatusContract[];
      case 'PLANNED':
        return ['IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as TripStatusContract[];
      case 'IN_PROGRESS':
        return ['COMPLETED', 'CANCELLED'] as TripStatusContract[];
      default:
        return [] as TripStatusContract[];
    }
  });

  readonly expenseEditable = computed(() => {
    const trip = this.trip();
    const report = this.expenseReport();
    if (!trip || !report) {
      return false;
    }
    const tripOk = trip.status === 'IN_PROGRESS' || trip.status === 'COMPLETED';
    const reportOk = report.status === 'DRAFT' || report.status === 'REJECTED';
    return tripOk && reportOk;
  });

  ngOnInit(): void {
    void this.bootstrap();
  }

  async bootstrap(): Promise<void> {
    this.isLoading.set(true);
    this.loadError.set('');
    try {
      await this.loadLookups();
      const idParam = this.route.snapshot.paramMap.get('id');
      if (!idParam || idParam === 'new') {
        this.isCreate.set(true);
        this.tripId.set(null);
        this.trip.set(null);
        this.expenseReport.set(null);
        this.editableLines.set([]);
        return;
      }
      this.isCreate.set(false);
      this.tripId.set(idParam);
      await this.loadTrip(idParam);
    } catch {
      this.loadError.set('pages.adminTrips.loadFailed');
      this.notify('pages.adminTrips.loadFailed', 'error');
    } finally {
      this.isLoading.set(false);
    }
  }

  setVehicleMode(mode: VehicleMode | undefined): void {
    if (!mode) {
      return;
    }
    this.vehicleMode.set(mode);
    if (mode === 'combination') {
      this.form.patchValue({ tractorId: '', trailerId: '' });
    } else {
      this.form.patchValue({ combinationId: '' });
    }
  }

  driverLabel(driver: DriverContractDto): string {
    const parts = [driver.lastName, driver.firstName, driver.patronymic].filter(Boolean);
    return `${parts.join(' ')} (${driver.phone})`;
  }

  combinationLabel(row: VehicleCombinationContractDto): string {
    const name = row.name?.trim();
    const plates = `${row.tractorPlateNumber} + ${row.trailerPlateNumber}`;
    return name ? `${name} (${plates})` : plates;
  }

  statusLabelKey(status: TripStatusContract): string {
    return `pages.adminTrips.status.${status}`;
  }

  expenseStatusLabelKey(status: string): string {
    return `pages.adminTrips.expenseStatus.${status}`;
  }

  categoryLabelKey(category: TripExpenseCategoryContract): string {
    return `pages.adminTrips.expenseCategory.${category}`;
  }

  async saveTrip(): Promise<void> {
    const payload = this.toTripPayload();
    if (!payload) {
      this.notify('pages.adminTrips.validationError', 'error');
      return;
    }
    this.isSaving.set(true);
    try {
      if (this.isCreate()) {
        const created = await this.tripsApi.create(payload);
        this.notify('pages.adminTrips.createSuccess');
        await this.router.navigate(['/admin/trips', created.id]);
        this.isCreate.set(false);
        this.tripId.set(created.id);
        await this.loadTrip(created.id);
      } else {
        const id = this.tripId();
        if (!id) {
          return;
        }
        await this.tripsApi.update(id, payload);
        this.notify('pages.adminTrips.updateSuccess');
        await this.loadTrip(id);
      }
    } catch (err) {
      this.notify(this.mapError(err, 'pages.adminTrips.saveFailed'), 'error');
    } finally {
      this.isSaving.set(false);
    }
  }

  async changeStatus(status: TripStatusContract): Promise<void> {
    const id = this.tripId();
    if (!id) {
      return;
    }
    if (status === 'PLANNED') {
      const validationError = this.validateReadyForPlanned();
      if (validationError) {
        this.notify(validationError, 'error');
        return;
      }
    }
    const ok = await firstValueFrom(
      this.dialog
        .open(ConfirmDialogComponent, {
          data: { messageKey: 'pages.adminTrips.statusConfirm' }
        })
        .afterClosed()
    );
    if (!ok) {
      return;
    }
    const payload = this.toTripPayload();
    if (!payload) {
      this.notify('pages.adminTrips.validationError', 'error');
      return;
    }
    try {
      // Спочатку зберігаємо форму — статус перевіряє дані в БД, не в полях UI.
      await this.tripsApi.update(id, payload);
      await this.tripsApi.updateStatus(id, status);
      this.notify('pages.adminTrips.statusUpdated');
      await this.loadTrip(id);
    } catch (err) {
      this.notify(this.mapError(err, 'pages.adminTrips.statusFailed'), 'error');
    }
  }

  addExpenseLine(): void {
    this.editableLines.update((lines) => [
      ...lines,
      {
        id: null,
        category: 'OTHER',
        amount: '',
        currencyCode: 'UAH',
        expenseDate: new Date().toISOString().slice(0, 10),
        description: '',
        storedFileId: null,
        receiptName: null
      }
    ]);
  }

  removeExpenseLine(index: number): void {
    this.editableLines.update((lines) => lines.filter((_, i) => i !== index));
  }

  updateExpenseLine(index: number, patch: Partial<EditableExpenseLine>): void {
    this.editableLines.update((lines) =>
      lines.map((line, i) => (i === index ? { ...line, ...patch } : line))
    );
  }

  async saveExpenseLines(): Promise<void> {
    const id = this.tripId();
    if (!id || !this.expenseEditable()) {
      return;
    }
    const lines = this.toExpensePayload();
    if (!lines) {
      this.notify('pages.adminTrips.expenseValidationError', 'error');
      return;
    }
    this.isExpenseBusy.set(true);
    try {
      const report = await this.tripsApi.replaceExpenseLinesAdmin(id, lines);
      this.applyExpenseReport(report);
      this.notify('pages.adminTrips.expenseSaved');
    } catch {
      this.notify('pages.adminTrips.expenseSaveFailed', 'error');
    } finally {
      this.isExpenseBusy.set(false);
    }
  }

  async onReceiptSelected(index: number, event: Event): Promise<void> {
    const id = this.tripId();
    const line = this.editableLines()[index];
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!id || !line?.id || !file) {
      if (!line?.id) {
        this.notify('pages.adminTrips.expenseSaveBeforeReceipt', 'error');
      }
      return;
    }
    this.isExpenseBusy.set(true);
    try {
      const report = await this.tripsApi.uploadReceiptAdmin(id, line.id, file);
      this.applyExpenseReport(report);
      this.notify('pages.adminTrips.receiptUploaded');
    } catch {
      this.notify('pages.adminTrips.receiptUploadFailed', 'error');
    } finally {
      this.isExpenseBusy.set(false);
    }
  }

  async deleteReceipt(index: number): Promise<void> {
    const id = this.tripId();
    const line = this.editableLines()[index];
    if (!id || !line?.id) {
      return;
    }
    const ok = await firstValueFrom(
      this.dialog
        .open(ConfirmDialogComponent, {
          data: { messageKey: 'pages.adminTrips.deleteReceiptConfirm' }
        })
        .afterClosed()
    );
    if (!ok) {
      return;
    }
    this.isExpenseBusy.set(true);
    try {
      const report = await this.tripsApi.deleteReceiptAdmin(id, line.id);
      this.applyExpenseReport(report);
      this.notify('pages.adminTrips.receiptDeleted');
    } catch {
      this.notify('pages.adminTrips.receiptDeleteFailed', 'error');
    } finally {
      this.isExpenseBusy.set(false);
    }
  }

  async submitExpense(): Promise<void> {
    await this.runExpenseAction(() => this.tripsApi.submitExpenseAdmin(this.tripId()!), 'pages.adminTrips.expenseSubmitted');
  }

  async approveExpense(): Promise<void> {
    await this.runExpenseAction(
      () => this.tripsApi.reviewExpense(this.tripId()!, true),
      'pages.adminTrips.expenseApproved'
    );
  }

  async rejectExpense(): Promise<void> {
    const id = this.tripId();
    if (!id) {
      return;
    }
    const ref = this.dialog.open(
      TripRejectCommentDialogComponent,
      getHandsetFriendlyDialogConfig({ width: 'min(420px, calc(100vw - 24px))' })
    );
    const comment = await firstValueFrom(ref.afterClosed());
    if (comment == null) {
      return;
    }
    await this.runExpenseAction(
      () => this.tripsApi.reviewExpense(id, false, comment || undefined),
      'pages.adminTrips.expenseRejected'
    );
  }

  async reopenExpense(): Promise<void> {
    await this.runExpenseAction(() => this.tripsApi.reopenExpense(this.tripId()!), 'pages.adminTrips.expenseReopened');
  }

  private async runExpenseAction(
    action: () => Promise<TripExpenseReportContractDto>,
    successKey: string
  ): Promise<void> {
    const id = this.tripId();
    if (!id) {
      return;
    }
    this.isExpenseBusy.set(true);
    try {
      const report = await action();
      this.applyExpenseReport(report);
      this.notify(successKey);
    } catch {
      this.notify('pages.adminTrips.expenseActionFailed', 'error');
    } finally {
      this.isExpenseBusy.set(false);
    }
  }

  private async loadLookups(): Promise<void> {
    const [drivers, combinations, vehicles] = await Promise.all([
      this.driversApi.list('active'),
      this.combinationsApi.list('active'),
      this.vehiclesApi.list('active')
    ]);
    this.drivers.set(drivers);
    this.combinations.set(combinations);
    this.tractors.set(vehicles.filter((v) => v.vehicleType === 'SEMI_TRACTOR'));
    this.trailers.set(vehicles.filter((v) => v.vehicleType === 'SEMI_TRAILER'));
  }

  private async loadTrip(id: string): Promise<void> {
    const trip = await this.tripsApi.getAdmin(id);
    this.trip.set(trip);
    this.patchForm(trip);
    try {
      const report = await this.tripsApi.getExpenseReportAdmin(id);
      this.applyExpenseReport(report);
    } catch {
      this.expenseReport.set(null);
      this.editableLines.set([]);
    }
  }

  private patchForm(trip: TripContractDto): void {
    const hasCombination = !!trip.combinationId;
    this.vehicleMode.set(hasCombination ? 'combination' : 'manual');
    this.form.patchValue({
      title: trip.title ?? '',
      comment: trip.comment ?? '',
      originText: trip.originText ?? '',
      destinationText: trip.destinationText ?? '',
      plannedStartAt: isoToLocalDate(trip.plannedStartAt),
      plannedEndAt: isoToLocalDate(trip.plannedEndAt),
      driverId: trip.driverId ?? '',
      combinationId: trip.combinationId ?? '',
      tractorId: trip.tractorId ?? '',
      trailerId: trip.trailerId ?? '',
      routeRequestId: trip.routeRequestId != null ? String(trip.routeRequestId) : ''
    });
  }

  private applyExpenseReport(report: TripExpenseReportContractDto): void {
    this.expenseReport.set(report);
    this.editableLines.set(report.lines.map((line) => this.toEditableLine(line)));
  }

  private toEditableLine(line: TripExpenseLineContractDto): EditableExpenseLine {
    return {
      id: line.id,
      category: line.category,
      amount: String(line.amount),
      currencyCode: line.currencyCode || 'UAH',
      expenseDate: line.expenseDate,
      description: line.description ?? '',
      storedFileId: line.storedFileId,
      receiptName: line.receipt?.originalFilename ?? null
    };
  }

  private toTripPayload(): CreateTripContractRequest | null {
    const raw = this.form.getRawValue();
    const routeRequestRaw = raw.routeRequestId.trim();
    let routeRequestId: number | null = null;
    if (routeRequestRaw) {
      const parsed = Number(routeRequestRaw);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        return null;
      }
      routeRequestId = parsed;
    }

    const payload: CreateTripContractRequest = {
      title: raw.title.trim() || null,
      comment: raw.comment.trim() || null,
      originText: raw.originText.trim() || null,
      destinationText: raw.destinationText.trim() || null,
      plannedStartAt: dateToUtcMidnightIso(raw.plannedStartAt),
      plannedEndAt: dateToUtcMidnightIso(raw.plannedEndAt),
      driverId: raw.driverId || null,
      routeRequestId,
      combinationId: null,
      tractorId: null,
      trailerId: null
    };

    if (this.vehicleMode() === 'combination') {
      payload.combinationId = raw.combinationId || null;
    } else {
      payload.tractorId = raw.tractorId || null;
      payload.trailerId = raw.trailerId || null;
    }
    return payload;
  }

  private toExpensePayload(): TripExpenseLineInputContract[] | null {
    const result: TripExpenseLineInputContract[] = [];
    for (const line of this.editableLines()) {
      const amount = Number(line.amount);
      if (!Number.isFinite(amount) || amount < 0 || !line.expenseDate || !line.currencyCode.trim()) {
        return null;
      }
      result.push({
        id: line.id,
        category: line.category,
        amount,
        currencyCode: line.currencyCode.trim().toUpperCase(),
        expenseDate: line.expenseDate,
        description: line.description.trim() || null
      });
    }
    return result;
  }

  private notify(messageKey: string, kind: 'success' | 'error' = 'success'): void {
    showAppSnack(this.snackBar, this.translate, messageKey, kind);
  }

  private validateReadyForPlanned(): string | null {
    const raw = this.form.getRawValue();
    if (!raw.driverId) {
      return 'pages.adminTrips.plannedRequiresDriver';
    }
    if (!raw.plannedStartAt || !raw.plannedEndAt) {
      return 'pages.adminTrips.plannedRequiresDates';
    }
    if (raw.plannedEndAt.getTime() < raw.plannedStartAt.getTime()) {
      return 'pages.adminTrips.plannedDatesInvalid';
    }
    if (this.vehicleMode() === 'combination') {
      if (!raw.combinationId) {
        return 'pages.adminTrips.plannedRequiresVehicle';
      }
    } else if (!raw.tractorId || !raw.trailerId) {
      return 'pages.adminTrips.plannedRequiresVehicle';
    }
    return null;
  }

  private mapError(err: unknown, fallback: string): string {
    const code = (err as { error?: { code?: string } })?.error?.code;
    switch (code) {
      case 'VALIDATION_ERROR':
        return 'pages.adminTrips.errors.plannedRequirements';
      case 'LICENSE_EXPIRED':
        return 'pages.adminTrips.errors.licenseExpired';
      case 'RESOURCE_OVERLAP':
        return 'pages.adminTrips.errors.resourceOverlap';
      case 'INVALID_STATUS_TRANSITION':
        return 'pages.adminTrips.errors.invalidStatusTransition';
      default:
        return fallback;
    }
  }
}

/** ISO → локальна дата для datepicker (без часу). */
function isoToLocalDate(iso: string | null): Date | null {
  if (!iso) {
    return null;
  }
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return new Date(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate());
}

/** Локальна дата → ISO на північ UTC обраного календарного дня. */
function dateToUtcMidnightIso(value: Date | null): string | null {
  if (!value) {
    return null;
  }
  const utc = new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
  return utc.toISOString();
}
