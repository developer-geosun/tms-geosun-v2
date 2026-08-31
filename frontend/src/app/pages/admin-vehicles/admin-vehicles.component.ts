import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
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
  RegistrationScanSideContract,
  StoredFileContractDto,
  VehicleContractDto,
  VehicleDocumentComplianceContract,
  VehicleDocumentsFilterContract,
  VehicleListViewContract,
  VehicleTypeContract,
  VehiclesApiService
} from '../../core/api';
import { LayoutService } from '../../core/layout';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { getHandsetFriendlyDialogConfig } from '../../shared/utils/handset-friendly-dialog-config';
import { VehicleFormDialogComponent } from './vehicle-form-dialog.component';
import {
  VehicleScanViewerDialogComponent,
  VehicleScanViewerDialogResult
} from './vehicle-scan-viewer-dialog.component';
import { showAppSnack } from '../../shared/utils/app-snackbar';

type VehiclesDisplayMode = 'table' | 'cards';

@Component({
  selector: 'app-admin-vehicles',
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
  templateUrl: './admin-vehicles.component.html',
  styleUrl: './admin-vehicles.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminVehiclesComponent implements OnDestroy {
  private static readonly DESKTOP_PAGE_SIZE = 10;
  private static readonly HANDSET_PAGE_SIZE = 5;

  private readonly vehiclesApi = inject(VehiclesApiService);
  private readonly dialog = inject(MatDialog);
  private readonly layout = inject(LayoutService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);

  readonly isHandset = this.layout.isHandset;
  readonly displayedColumns = [
    'plateNumber',
    'makeModel',
    'vin',
    'manufactureYear',
    'vehicleType',
    'owner',
    'registration',
    'scans',
    'documents',
    'status',
    'actions'
  ];
  readonly pageSizeOptions = [5, 10, 25, 50];

  readonly isLoading = signal(false);
  readonly loadError = signal('');
  /** Повний список з API (view=all) для лічильників і клієнтського фільтра. */
  readonly allVehicles = signal<VehicleContractDto[]>([]);
  readonly listView = signal<VehicleListViewContract>('all');
  readonly documentsFilter = signal<VehicleDocumentsFilterContract>('all');
  readonly pageIndex = signal(0);
  readonly pageSize = signal(AdminVehiclesComponent.DESKTOP_PAGE_SIZE);
  /** Ручний вибір на desktop; на handset завжди картки. */
  readonly preferredDisplayMode = signal<VehiclesDisplayMode>('table');
  /** blob: URL мініатюр сканів за ключем vehicleId:side. */
  readonly scanPreviewUrls = signal<ReadonlyMap<string, string>>(new Map());
  /** Ключ прев’ю під час drag-over (vehicleId:side). */
  readonly scanDragOverKey = signal<string | null>(null);
  /** Ключ прев’ю під час upload з DnD. */
  readonly scanUploadBusyKey = signal<string | null>(null);
  readonly scanSides: RegistrationScanSideContract[] = ['front', 'back'];
  private previewLoadEpoch = 0;
  private scanDragDepth = 0;
  private scanDragActiveKey: string | null = null;

  private static readonly ALLOWED_SCAN_MIME = new Set([
    'image/jpeg',
    'image/png',
    'application/pdf'
  ]);

  readonly displayMode = computed<VehiclesDisplayMode>(() =>
    this.isHandset() ? 'cards' : this.preferredDisplayMode()
  );

  readonly countAll = computed(() => this.allVehicles().length);
  readonly countActive = computed(
    () => this.allVehicles().filter((v) => !v.deleted).length
  );
  readonly countDeleted = computed(
    () => this.allVehicles().filter((v) => v.deleted).length
  );

  readonly vehicles = computed(() => {
    const all = this.allVehicles();
    let byStatus: VehicleContractDto[];
    switch (this.listView()) {
      case 'active':
        byStatus = all.filter((v) => !v.deleted);
        break;
      case 'deleted':
        byStatus = all.filter((v) => v.deleted);
        break;
      default:
        byStatus = all;
    }
    const docsFilter = this.documentsFilter();
    if (docsFilter === 'all') {
      return byStatus;
    }
    const complianceMap: Record<Exclude<VehicleDocumentsFilterContract, 'all'>, VehicleDocumentComplianceContract> =
      {
        ok: 'OK',
        attention: 'ATTENTION',
        problem: 'PROBLEM'
      };
    const needed = complianceMap[docsFilter];
    return byStatus.filter((v) => v.documentCompliance === needed);
  });

  readonly pagedVehicles = computed(() => {
    const filtered = this.vehicles();
    const start = this.pageIndex() * this.pageSize();
    return filtered.slice(start, start + this.pageSize());
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
      this.clampPageIndex();
    });
    effect(() => {
      const rows = this.pagedVehicles();
      void this.ensureScanPreviews(rows);
    });
    void this.reload();
  }

  ngOnDestroy(): void {
    this.revokeAllPreviews();
  }

  async reload(): Promise<void> {
    this.isLoading.set(true);
    this.loadError.set('');
    this.revokeAllPreviews();
    try {
      const list = await this.vehiclesApi.list('all');
      this.allVehicles.set(list);
      this.clampPageIndex();
    } catch {
      this.loadError.set('pages.adminVehicles.loadFailed');
      this.notify('pages.adminVehicles.loadFailed', 'error');
    } finally {
      this.isLoading.set(false);
    }
  }

  onViewChange(view: VehicleListViewContract | undefined): void {
    if (!view) {
      return;
    }
    this.listView.set(view);
    this.pageIndex.set(0);
  }

  onDocumentsFilterChange(filter: VehicleDocumentsFilterContract | undefined): void {
    if (!filter) {
      return;
    }
    this.documentsFilter.set(filter);
    this.pageIndex.set(0);
  }

  complianceLabelKey(compliance: VehicleDocumentComplianceContract): string {
    return `pages.adminVehicles.compliance.${compliance}`;
  }

  onDisplayModeChange(mode: VehiclesDisplayMode | undefined): void {
    if (!mode) {
      return;
    }
    this.preferredDisplayMode.set(mode);
  }

  onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }

  private clampPageIndex(): void {
    const maxPage = Math.max(0, Math.ceil(this.vehicles().length / this.pageSize()) - 1);
    if (this.pageIndex() > maxPage) {
      this.pageIndex.set(maxPage);
    }
  }

  async openCreate(): Promise<void> {
    await this.openFormDialog(null);
  }

  async openEdit(row: VehicleContractDto): Promise<void> {
    await this.openFormDialog(row);
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
      this.notify('pages.adminVehicles.deleteSuccess');
      await this.reload();
    } catch {
      this.notify('pages.adminVehicles.deleteFailed', 'error');
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
      await this.vehiclesApi.restore(row.id);
      this.notify('pages.adminVehicles.restoreSuccess');
      await this.reload();
    } catch (err) {
      this.notify(this.mapError(err, 'pages.adminVehicles.restoreFailed'), 'error');
    }
  }

  typeLabelKey(type: VehicleTypeContract): string {
    return `pages.adminVehicles.types.${type}`;
  }

  registrationLabel(row: VehicleContractDto): string {
    return `${row.registrationSeries} ${row.registrationNumber}`.trim();
  }

  hasScan(row: VehicleContractDto, side: RegistrationScanSideContract): boolean {
    return this.scanFile(row, side) != null;
  }

  scanSideLabelKey(side: RegistrationScanSideContract): string {
    return side === 'front'
      ? 'pages.adminVehicles.scanFront'
      : 'pages.adminVehicles.scanBack';
  }

  scanFile(row: VehicleContractDto, side: RegistrationScanSideContract): StoredFileContractDto | null {
    return side === 'front' ? row.scanFront : row.scanBack;
  }

  isScanImage(file: StoredFileContractDto | null): boolean {
    return (file?.contentType ?? '').toLowerCase().startsWith('image/');
  }

  isScanPdf(file: StoredFileContractDto | null): boolean {
    return (file?.contentType ?? '').toLowerCase() === 'application/pdf';
  }

  scanPreviewUrl(row: VehicleContractDto, side: RegistrationScanSideContract): string | null {
    return this.scanPreviewUrls().get(this.previewKey(row.id, side)) ?? null;
  }

  isScanDragOver(row: VehicleContractDto, side: RegistrationScanSideContract): boolean {
    return this.scanDragOverKey() === this.previewKey(row.id, side);
  }

  isScanUploadBusy(row: VehicleContractDto, side: RegistrationScanSideContract): boolean {
    return this.scanUploadBusyKey() === this.previewKey(row.id, side);
  }

  onScanDragEnter(
    row: VehicleContractDto,
    side: RegistrationScanSideContract,
    event: DragEvent
  ): void {
    event.preventDefault();
    event.stopPropagation();
    if (row.deleted || this.scanUploadBusyKey() || !this.hasFilePayload(event)) {
      return;
    }
    const key = this.previewKey(row.id, side);
    if (this.scanDragActiveKey !== key) {
      this.scanDragActiveKey = key;
      this.scanDragDepth = 0;
    }
    this.scanDragDepth += 1;
    this.scanDragOverKey.set(key);
  }

  onScanDragOver(
    row: VehicleContractDto,
    side: RegistrationScanSideContract,
    event: DragEvent
  ): void {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect =
        row.deleted || this.scanUploadBusyKey() ? 'none' : 'copy';
    }
  }

  onScanDragLeave(
    row: VehicleContractDto,
    side: RegistrationScanSideContract,
    event: DragEvent
  ): void {
    event.preventDefault();
    event.stopPropagation();
    const key = this.previewKey(row.id, side);
    if (this.scanDragActiveKey !== key || !this.scanDragOverKey()) {
      return;
    }
    this.scanDragDepth = Math.max(0, this.scanDragDepth - 1);
    if (this.scanDragDepth === 0) {
      this.scanDragOverKey.set(null);
      this.scanDragActiveKey = null;
    }
  }

  onScanDrop(
    row: VehicleContractDto,
    side: RegistrationScanSideContract,
    event: DragEvent
  ): void {
    event.preventDefault();
    event.stopPropagation();
    this.scanDragDepth = 0;
    this.scanDragOverKey.set(null);
    this.scanDragActiveKey = null;
    if (row.deleted || this.scanUploadBusyKey()) {
      return;
    }
    const file = event.dataTransfer?.files?.[0];
    if (!file) {
      return;
    }
    void this.uploadScanFromList(row, side, file);
  }

  async openScanViewer(
    row: VehicleContractDto,
    side: RegistrationScanSideContract,
    event?: Event
  ): Promise<void> {
    event?.stopPropagation();
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
          file: this.scanFile(row, side)
        }
      })
    );
    const result = (await firstValueFrom(
      ref.afterClosed()
    )) as VehicleScanViewerDialogResult | undefined;
    if (!result?.changed) {
      return;
    }
    this.applyScanChange(row.id, side, result.file);
  }

  private async uploadScanFromList(
    row: VehicleContractDto,
    side: RegistrationScanSideContract,
    file: File
  ): Promise<void> {
    if (row.deleted || this.scanUploadBusyKey()) {
      return;
    }
    if (!this.isAllowedScanFile(file)) {
      this.notify('pages.adminVehicles.scanInvalidType', 'error');
      return;
    }
    if (this.hasScan(row, side)) {
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
    const key = this.previewKey(row.id, side);
    this.scanUploadBusyKey.set(key);
    try {
      const saved = await this.vehiclesApi.uploadScan(row.id, side, file);
      this.applyScanChange(row.id, side, saved);
      this.notify('pages.adminVehicles.scanUploadSuccess');
    } catch {
      this.notify('pages.adminVehicles.scanUploadFailed', 'error');
    } finally {
      this.scanUploadBusyKey.set(null);
    }
  }

  private applyScanChange(
    vehicleId: string,
    side: RegistrationScanSideContract,
    file: StoredFileContractDto | null
  ): void {
    this.patchVehicleScan(vehicleId, side, file);
    this.dropPreview(vehicleId, side);
    if (file && this.isScanImage(file)) {
      const updated = this.allVehicles().find((v) => v.id === vehicleId);
      if (updated) {
        void this.ensureScanPreviews([updated]);
      }
    }
  }

  private isAllowedScanFile(file: File): boolean {
    const mime = (file.type || '').toLowerCase();
    if (AdminVehiclesComponent.ALLOWED_SCAN_MIME.has(mime)) {
      return true;
    }
    const name = file.name.toLowerCase();
    return (
      name.endsWith('.jpg') ||
      name.endsWith('.jpeg') ||
      name.endsWith('.png') ||
      name.endsWith('.pdf')
    );
  }

  private hasFilePayload(event: DragEvent): boolean {
    const types = event.dataTransfer?.types;
    if (!types) {
      return false;
    }
    return Array.from(types).includes('Files');
  }

  private patchVehicleScan(
    vehicleId: string,
    side: RegistrationScanSideContract,
    file: StoredFileContractDto | null
  ): void {
    this.allVehicles.update((list) =>
      list.map((vehicle) => {
        if (vehicle.id !== vehicleId) {
          return vehicle;
        }
        return side === 'front'
          ? { ...vehicle, scanFront: file }
          : { ...vehicle, scanBack: file };
      })
    );
  }

  private previewKey(vehicleId: string, side: RegistrationScanSideContract): string {
    return `${vehicleId}:${side}`;
  }

  private async ensureScanPreviews(rows: VehicleContractDto[]): Promise<void> {
    const tasks: {
      vehicleId: string;
      side: RegistrationScanSideContract;
      file: StoredFileContractDto;
    }[] = [];
    for (const row of rows) {
      if (row.scanFront && this.isScanImage(row.scanFront)) {
        tasks.push({ vehicleId: row.id, side: 'front', file: row.scanFront });
      }
      if (row.scanBack && this.isScanImage(row.scanBack)) {
        tasks.push({ vehicleId: row.id, side: 'back', file: row.scanBack });
      }
    }
    const existing = this.scanPreviewUrls();
    const missing = tasks.filter(
      (task) => !existing.has(this.previewKey(task.vehicleId, task.side))
    );
    if (missing.length === 0) {
      return;
    }

    const epoch = this.previewLoadEpoch;
    const loaded = new Map<string, string>();
    await Promise.all(
      missing.map(async (task) => {
        try {
          const blob = await this.vehiclesApi.downloadScanBlob(task.vehicleId, task.side);
          const url = URL.createObjectURL(blob);
          if (epoch !== this.previewLoadEpoch) {
            URL.revokeObjectURL(url);
            return;
          }
          loaded.set(this.previewKey(task.vehicleId, task.side), url);
        } catch {
          // Прев’ю опційне.
        }
      })
    );

    if (epoch !== this.previewLoadEpoch || loaded.size === 0) {
      for (const url of loaded.values()) {
        URL.revokeObjectURL(url);
      }
      return;
    }

    const next = new Map(this.scanPreviewUrls());
    for (const [key, url] of loaded) {
      const previous = next.get(key);
      if (previous) {
        URL.revokeObjectURL(previous);
      }
      next.set(key, url);
    }
    this.scanPreviewUrls.set(next);
  }

  private dropPreview(vehicleId: string, side: RegistrationScanSideContract): void {
    const key = this.previewKey(vehicleId, side);
    const next = new Map(this.scanPreviewUrls());
    const previous = next.get(key);
    if (previous) {
      URL.revokeObjectURL(previous);
      next.delete(key);
      this.scanPreviewUrls.set(next);
    }
  }

  private revokeAllPreviews(): void {
    this.previewLoadEpoch += 1;
    for (const url of this.scanPreviewUrls().values()) {
      URL.revokeObjectURL(url);
    }
    this.scanPreviewUrls.set(new Map());
  }

  private async openFormDialog(vehicle: VehicleContractDto | null): Promise<void> {
    const ref = this.dialog.open(
      VehicleFormDialogComponent,
      getHandsetFriendlyDialogConfig({
        width: 'min(640px, calc(100vw - 24px))',
        maxHeight: 'min(92vh, 900px)',
        data: {
          vehicle,
          makeOptions: this.uniqueMakes()
        }
      })
    );
    const changed = await firstValueFrom(ref.afterClosed());
    if (changed) {
      await this.reload();
    }
  }

  /** Унікальні марки з усіх ТЗ (UPPERCASE, відсортовані). */
  private uniqueMakes(): string[] {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const vehicle of this.allVehicles()) {
      const make = vehicle.make?.trim().toLocaleUpperCase('uk-UA') ?? '';
      if (!make || seen.has(make)) {
        continue;
      }
      seen.add(make);
      result.push(make);
    }
    return result.sort((a, b) => a.localeCompare(b, 'uk'));
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
      default:
        return fallback;
    }
  }
}
