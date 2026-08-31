import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  inject,
  signal,
  viewChild
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { firstValueFrom } from 'rxjs';
import {
  RegistrationScanSideContract,
  StoredFileContractDto,
  VehiclesApiService
} from '../../core/api';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { showAppSnack } from '../../shared/utils/app-snackbar';

export interface VehicleScanViewerDialogData {
  vehicleId: string;
  side: RegistrationScanSideContract;
  plateNumber: string;
  vehicleDeleted: boolean;
  file: StoredFileContractDto | null;
}

export interface VehicleScanViewerDialogResult {
  changed: boolean;
  file: StoredFileContractDto | null;
}

const ALLOWED_SCAN_MIME = new Set(['image/jpeg', 'image/png', 'application/pdf']);

@Component({
  selector: 'app-vehicle-scan-viewer-dialog',
  standalone: true,
  imports: [
    TranslateModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule
  ],
  templateUrl: './vehicle-scan-viewer-dialog.component.html',
  styleUrl: './vehicle-scan-viewer-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VehicleScanViewerDialogComponent implements OnDestroy {
  private readonly data = inject<VehicleScanViewerDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(
    MatDialogRef<VehicleScanViewerDialogComponent, VehicleScanViewerDialogResult>
  );
  private readonly vehiclesApi = inject(VehiclesApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);
  private readonly sanitizer = inject(DomSanitizer);

  private readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  readonly vehicleId = this.data.vehicleId;
  readonly side = this.data.side;
  readonly plateNumber = this.data.plateNumber;
  readonly vehicleDeleted = this.data.vehicleDeleted;

  readonly file = signal<StoredFileContractDto | null>(this.data.file);
  readonly objectUrl = signal<string | null>(null);
  readonly safePdfUrl = signal<SafeResourceUrl | null>(null);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly isDragOver = signal(false);
  /** Лічильник dragenter/dragleave, щоб не блимало на дочірніх елементах. */
  private dragDepth = 0;
  private changed = false;

  readonly sideTitleKey =
    this.side === 'front'
      ? 'pages.adminVehicles.scanFront'
      : 'pages.adminVehicles.scanBack';

  constructor() {
    // Закриття лише через close(), щоб зберегти результат (changed/file).
    this.dialogRef.disableClose = true;
    this.dialogRef.backdropClick().subscribe(() => {
      if (!this.busy()) {
        this.close();
      }
    });
    this.dialogRef.keydownEvents().subscribe((event) => {
      if (event.key === 'Escape' && !this.busy()) {
        this.close();
      }
    });
    if (this.data.file) {
      void this.loadPreview();
    }
  }

  ngOnDestroy(): void {
    this.revokeUrl();
  }

  close(): void {
    this.dialogRef.close({ changed: this.changed, file: this.file() });
  }

  isImage(contentType: string | null | undefined): boolean {
    return (contentType ?? '').toLowerCase().startsWith('image/');
  }

  isPdf(contentType: string | null | undefined): boolean {
    return (contentType ?? '').toLowerCase() === 'application/pdf';
  }

  get canAcceptDrop(): boolean {
    return !this.vehicleDeleted && !this.busy() && !this.loading();
  }

  triggerReplace(): void {
    this.fileInput()?.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const selected = input.files?.[0];
    input.value = '';
    if (!selected) {
      return;
    }
    void this.acceptIncomingFile(selected);
  }

  onDragEnter(event: DragEvent): void {
    event.preventDefault();
    if (!this.canAcceptDrop || !this.hasFilePayload(event)) {
      return;
    }
    this.dragDepth += 1;
    this.isDragOver.set(true);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = this.canAcceptDrop ? 'copy' : 'none';
    }
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    if (!this.isDragOver()) {
      return;
    }
    this.dragDepth = Math.max(0, this.dragDepth - 1);
    if (this.dragDepth === 0) {
      this.isDragOver.set(false);
    }
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragDepth = 0;
    this.isDragOver.set(false);
    if (!this.canAcceptDrop) {
      return;
    }
    const dropped = event.dataTransfer?.files?.[0];
    if (!dropped) {
      return;
    }
    void this.acceptIncomingFile(dropped);
  }

  async deleteFile(): Promise<void> {
    if (!this.file() || this.vehicleDeleted || this.busy()) {
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
    this.busy.set(true);
    try {
      await this.vehiclesApi.deleteScan(this.vehicleId, this.side);
      this.changed = true;
      this.file.set(null);
      this.revokeUrl();
      this.notify('pages.adminVehicles.scanDeleteSuccess');
    } catch {
      this.notify('pages.adminVehicles.scanDeleteFailed', 'error');
    } finally {
      this.busy.set(false);
    }
  }

  private async acceptIncomingFile(file: File): Promise<void> {
    if (this.vehicleDeleted || this.busy()) {
      return;
    }
    if (!this.isAllowedScanFile(file)) {
      this.notify('pages.adminVehicles.scanInvalidType', 'error');
      return;
    }
    if (this.file()) {
      const ok = await firstValueFrom(
        this.dialog
          .open(ConfirmDialogComponent, {
            data: { messageKey: 'pages.adminVehicles.scanReplaceConfirm' }
          })
          .afterClosed()
      );
      if (!ok) {
        return;
      }
    }
    await this.upload(file);
  }

  private isAllowedScanFile(file: File): boolean {
    const mime = (file.type || '').toLowerCase();
    if (ALLOWED_SCAN_MIME.has(mime)) {
      return true;
    }
    // Fallback за розширенням (деякі ОС не передають MIME при DnD).
    const name = file.name.toLowerCase();
    return name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png') || name.endsWith('.pdf');
  }

  private hasFilePayload(event: DragEvent): boolean {
    const types = event.dataTransfer?.types;
    if (!types) {
      return false;
    }
    return Array.from(types).includes('Files');
  }

  private async upload(file: File): Promise<void> {
    this.busy.set(true);
    try {
      const saved = await this.vehiclesApi.uploadScan(this.vehicleId, this.side, file);
      this.changed = true;
      this.file.set(saved);
      this.notify('pages.adminVehicles.scanUploadSuccess');
      await this.loadPreview();
    } catch {
      this.notify('pages.adminVehicles.scanUploadFailed', 'error');
    } finally {
      this.busy.set(false);
    }
  }

  private async loadPreview(): Promise<void> {
    const current = this.file();
    if (!current) {
      this.revokeUrl();
      return;
    }
    this.loading.set(true);
    try {
      const blob = await this.vehiclesApi.downloadScanBlob(this.vehicleId, this.side);
      const url = URL.createObjectURL(blob);
      this.revokeUrl();
      this.objectUrl.set(url);
      if (this.isPdf(current.contentType)) {
        this.safePdfUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
      } else {
        this.safePdfUrl.set(null);
      }
    } catch {
      this.revokeUrl();
      this.notify('pages.adminVehicles.scanOpenFailed', 'error');
    } finally {
      this.loading.set(false);
    }
  }

  private revokeUrl(): void {
    const url = this.objectUrl();
    if (url) {
      URL.revokeObjectURL(url);
    }
    this.objectUrl.set(null);
    this.safePdfUrl.set(null);
  }

  private notify(messageKey: string, kind: 'success' | 'error' = 'success'): void {
    showAppSnack(this.snackBar, this.translate, messageKey, kind);
  }
}
