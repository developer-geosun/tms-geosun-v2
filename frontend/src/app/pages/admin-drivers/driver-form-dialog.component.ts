import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';
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
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatStepperModule } from '@angular/material/stepper';
import { firstValueFrom } from 'rxjs';
import {
  DriverContractDto,
  DriverDocumentGroupContractDto,
  DriverDocumentStatusContract,
  DriverDocumentTypeContract,
  DriversApiService,
  LinkableUserContractDto,
  RegistrationScanSideContract
} from '../../core/api';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { showAppSnack } from '../../shared/utils/app-snackbar';
import {
  filterDriverPersonNameChars,
  sanitizeDriverPersonNameInput
} from './driver-person-name.util';

export interface DriverFormDialogData {
  driver: DriverContractDto | null;
}

@Component({
  selector: 'app-driver-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    TranslateModule,
    MatButtonModule,
    MatDatepickerModule,
    MatDialogModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSnackBarModule,
    MatStepperModule
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
  templateUrl: './driver-form-dialog.component.html',
  styleUrl: './driver-form-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DriverFormDialogComponent {
  private readonly data = inject<DriverFormDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<DriverFormDialogComponent, boolean>);
  private readonly formBuilder = inject(FormBuilder);
  private readonly driversApi = inject(DriversApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);

  readonly driver = signal<DriverContractDto | null>(this.data.driver);
  readonly documentGroups = signal<DriverDocumentGroupContractDto[]>([]);
  readonly documentsLoading = signal(false);
  readonly documentBusy = signal(false);
  readonly saving = signal(false);
  readonly linkBusy = signal(false);
  readonly linkEmail = signal('');
  readonly linkableUser = signal<LinkableUserContractDto | null>(null);
  /** Активний крок: 0 — дані, 1 — обліковий запис, 2 — документи. */
  readonly stepIndex = signal(0);
  /** Тип+сторона, для яких відкрита форма додавання версії. */
  readonly addFormKey = signal<string | null>(null);
  readonly addValidFrom = signal<Date | null>(null);
  readonly addValidTo = signal<Date | null>(null);
  readonly addFile = signal<File | null>(null);
  /** Чи були зміни, щоб батьківська сторінка перезавантажила список. */
  private readonly changed = signal(false);

  readonly isCreate = computed(() => this.driver() == null);
  readonly isDeleted = computed(() => this.driver()?.deleted === true);
  readonly hasDriverId = computed(() => !!this.driver()?.id);
  readonly onDataStep = computed(() => this.stepIndex() === 0);
  readonly onAccountStep = computed(() => this.stepIndex() === 1);
  readonly onDocumentsStep = computed(() => this.stepIndex() === 2);

  readonly dialogTitle = computed(() => {
    if (this.isCreate()) {
      return this.translate.instant('pages.adminDrivers.createTitle');
    }
    const row = this.driver();
    const name = row
      ? [row.lastName, row.firstName].filter(Boolean).join(' ')
      : '';
    const base = this.translate.instant('pages.adminDrivers.editTitle');
    return name ? `${base} · ${name}` : base;
  });

  readonly form = this.formBuilder.nonNullable.group({
    lastName: ['', [Validators.required, Validators.maxLength(128)]],
    firstName: ['', [Validators.required, Validators.maxLength(128)]],
    patronymic: ['', [Validators.maxLength(128)]],
    phone: ['', [Validators.required, Validators.maxLength(32)]],
    licenseNumber: ['', [Validators.required, Validators.maxLength(64)]],
    licenseCategories: ['', [Validators.required, Validators.maxLength(64)]],
    licenseExpiresOn: [null as Date | null, Validators.required],
    comment: ['', [Validators.maxLength(1000)]]
  });

  constructor() {
    const existing = this.data.driver;
    if (existing) {
      this.patchForm(existing);
      if (existing.deleted) {
        this.form.disable();
      }
      void this.reloadDocuments();
    }
  }

  close(): void {
    this.dialogRef.close(this.changed());
  }

  onStepChange(index: number): void {
    this.stepIndex.set(index);
    if (index === 2 && this.driver()?.id) {
      void this.reloadDocuments();
    }
  }

  goNext(): void {
    this.onStepChange(Math.min(2, this.stepIndex() + 1));
  }

  goPrev(): void {
    this.onStepChange(Math.max(0, this.stepIndex() - 1));
  }

  /** Нормалізує прізвище, ім’я або по батькові під час вводу. */
  onPersonNameInput(
    controlName: 'lastName' | 'firstName' | 'patronymic',
    event: Event
  ): void {
    const input = event.target as HTMLInputElement;
    const cursor = input.selectionStart ?? input.value.length;
    const nextCursor = filterDriverPersonNameChars(input.value.slice(0, cursor)).length;
    const sanitized = sanitizeDriverPersonNameInput(input.value);
    if (input.value !== sanitized) {
      input.value = sanitized;
    }
    this.form.controls[controlName].setValue(sanitized, { emitEvent: false });
    this.form.controls[controlName].markAsDirty();
    input.setSelectionRange(nextCursor, nextCursor);
  }

  async save(): Promise<void> {
    if (this.form.invalid || this.isDeleted() || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    if (!raw.licenseExpiresOn) {
      this.form.controls.licenseExpiresOn.markAsTouched();
      return;
    }
    const payload = {
      lastName: sanitizeDriverPersonNameInput(raw.lastName),
      firstName: sanitizeDriverPersonNameInput(raw.firstName),
      patronymic: sanitizeDriverPersonNameInput(raw.patronymic) || null,
      phone: raw.phone.trim(),
      licenseNumber: raw.licenseNumber.trim(),
      licenseCategories: raw.licenseCategories.trim(),
      licenseExpiresOn: this.toIsoDate(raw.licenseExpiresOn),
      comment: raw.comment.trim() || null
    };
    this.saving.set(true);
    try {
      const id = this.driver()?.id;
      if (id) {
        const updated = await this.driversApi.update(id, payload);
        this.driver.set(updated);
        this.changed.set(true);
        this.notify('pages.adminDrivers.updateSuccess');
        await this.reloadDocuments();
      } else {
        const created = await this.driversApi.create(payload);
        this.driver.set(created);
        this.patchForm(created);
        this.changed.set(true);
        this.notify('pages.adminDrivers.createSuccess');
        await this.reloadDocuments();
        this.stepIndex.set(1);
      }
    } catch (err) {
      this.notify(this.mapError(err, 'pages.adminDrivers.saveFailed'), 'error');
    } finally {
      this.saving.set(false);
    }
  }

  onLinkEmailInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.linkEmail.set(value);
    this.linkableUser.set(null);
  }

  async findLinkableUser(): Promise<void> {
    const email = this.linkEmail().trim();
    if (!email || this.linkBusy() || this.isDeleted()) {
      return;
    }
    this.linkBusy.set(true);
    this.linkableUser.set(null);
    try {
      const user = await this.driversApi.findLinkableUser(email);
      this.linkableUser.set(user);
    } catch (err) {
      this.notify(this.mapError(err, 'pages.adminDrivers.linkFindFailed'), 'error');
    } finally {
      this.linkBusy.set(false);
    }
  }

  async linkUser(): Promise<void> {
    const driverId = this.driver()?.id;
    const user = this.linkableUser();
    if (!driverId || !user || this.isDeleted() || this.linkBusy()) {
      return;
    }
    this.linkBusy.set(true);
    try {
      const updated = await this.driversApi.linkUser(driverId, user.id);
      this.driver.set(updated);
      this.linkableUser.set(null);
      this.linkEmail.set('');
      this.changed.set(true);
      this.notify('pages.adminDrivers.linkSuccess');
    } catch (err) {
      this.notify(this.mapError(err, 'pages.adminDrivers.linkFailed'), 'error');
    } finally {
      this.linkBusy.set(false);
    }
  }

  async unlinkUser(): Promise<void> {
    const driverId = this.driver()?.id;
    if (!driverId || this.isDeleted() || this.linkBusy()) {
      return;
    }
    const ok = await firstValueFrom(
      this.dialog
        .open(ConfirmDialogComponent, {
          data: { messageKey: 'pages.adminDrivers.unlinkConfirm' }
        })
        .afterClosed()
    );
    if (!ok) {
      return;
    }
    this.linkBusy.set(true);
    try {
      const updated = await this.driversApi.unlinkUser(driverId);
      this.driver.set(updated);
      this.changed.set(true);
      this.notify('pages.adminDrivers.unlinkSuccess');
    } catch (err) {
      this.notify(this.mapError(err, 'pages.adminDrivers.unlinkFailed'), 'error');
    } finally {
      this.linkBusy.set(false);
    }
  }

  groupKey(group: DriverDocumentGroupContractDto): string {
    return `${group.documentType}:${group.side}`;
  }

  documentTypeKey(type: DriverDocumentTypeContract): string {
    return `pages.adminDrivers.documentTypes.${type}`;
  }

  documentSideKey(side: 'FRONT' | 'BACK'): string {
    return `pages.adminDrivers.documentSides.${side}`;
  }

  documentStatusKey(status: DriverDocumentStatusContract): string {
    return `pages.adminDrivers.documentStatuses.${status}`;
  }

  startAddDocument(group: DriverDocumentGroupContractDto): void {
    this.addFormKey.set(this.groupKey(group));
    this.addValidFrom.set(null);
    this.addValidTo.set(null);
    this.addFile.set(null);
  }

  cancelAddDocument(): void {
    this.addFormKey.set(null);
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

  async submitAddDocument(group: DriverDocumentGroupContractDto): Promise<void> {
    const driverId = this.driver()?.id;
    const from = this.addValidFrom();
    const to = this.addValidTo();
    const file = this.addFile();
    if (!driverId || !from || !to || !file || this.isDeleted()) {
      this.notify('pages.adminDrivers.documentAddIncomplete', 'error');
      return;
    }
    if (to.getTime() < from.getTime()) {
      this.notify('pages.adminDrivers.documentDatesInvalid', 'error');
      return;
    }
    this.documentBusy.set(true);
    try {
      await this.driversApi.addDocument(
        driverId,
        group.documentType,
        this.toApiSide(group.side),
        this.toIsoDate(from),
        this.toIsoDate(to),
        file
      );
      this.changed.set(true);
      this.notify('pages.adminDrivers.documentAddSuccess');
      this.cancelAddDocument();
      await this.reloadDocuments();
      this.driver.set(await this.driversApi.getById(driverId));
    } catch (err) {
      this.notify(this.mapError(err, 'pages.adminDrivers.documentAddFailed'), 'error');
    } finally {
      this.documentBusy.set(false);
    }
  }

  async openDocumentFile(documentId: string): Promise<void> {
    const driverId = this.driver()?.id;
    if (!driverId) {
      return;
    }
    try {
      const blob = await this.driversApi.downloadDocumentBlob(driverId, documentId);
      this.openBlob(blob);
    } catch {
      this.notify('pages.adminDrivers.documentOpenFailed', 'error');
    }
  }

  async deleteDocumentVersion(documentId: string): Promise<void> {
    const driverId = this.driver()?.id;
    if (!driverId || this.isDeleted()) {
      return;
    }
    const ok = await firstValueFrom(
      this.dialog
        .open(ConfirmDialogComponent, {
          data: { messageKey: 'pages.adminDrivers.documentDeleteConfirm' }
        })
        .afterClosed()
    );
    if (!ok) {
      return;
    }
    this.documentBusy.set(true);
    try {
      await this.driversApi.deleteDocument(driverId, documentId);
      this.changed.set(true);
      this.notify('pages.adminDrivers.documentDeleteSuccess');
      await this.reloadDocuments();
      this.driver.set(await this.driversApi.getById(driverId));
    } catch {
      this.notify('pages.adminDrivers.documentDeleteFailed', 'error');
    } finally {
      this.documentBusy.set(false);
    }
  }

  private async reloadDocuments(): Promise<void> {
    const id = this.driver()?.id;
    if (!id) {
      this.documentGroups.set([]);
      return;
    }
    this.documentsLoading.set(true);
    try {
      const response = await this.driversApi.listDocuments(id);
      this.documentGroups.set(response.documents);
    } catch {
      this.notify('pages.adminDrivers.documentsLoadFailed', 'error');
    } finally {
      this.documentsLoading.set(false);
    }
  }

  private patchForm(row: DriverContractDto): void {
    this.form.patchValue({
      lastName: sanitizeDriverPersonNameInput(row.lastName),
      firstName: sanitizeDriverPersonNameInput(row.firstName),
      patronymic: sanitizeDriverPersonNameInput(row.patronymic ?? ''),
      phone: row.phone,
      licenseNumber: row.licenseNumber,
      licenseCategories: row.licenseCategories,
      licenseExpiresOn: this.parseIsoDate(row.licenseExpiresOn),
      comment: row.comment ?? ''
    });
  }

  private toApiSide(side: 'FRONT' | 'BACK'): RegistrationScanSideContract {
    return side === 'FRONT' ? 'front' : 'back';
  }

  private parseIsoDate(value: string): Date | null {
    if (!value) {
      return null;
    }
    const [y, m, d] = value.split('-').map(Number);
    if (!y || !m || !d) {
      return null;
    }
    return new Date(y, m - 1, d);
  }

  private toIsoDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private openBlob(blob: Blob): void {
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
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
