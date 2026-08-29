import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  OnInit,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { StoredFileContractDto, StoredFilesApiService } from '../../core/api';
import { LayoutService } from '../../core/layout';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { showAppSnack } from '../../shared/utils/app-snackbar';

@Component({
  selector: 'app-admin-file-storage-test',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatIconModule,
    MatPaginatorModule,
    MatTableModule,
    MatTooltipModule,
    MatProgressBarModule
  ],
  templateUrl: './admin-file-storage-test.component.html',
  styleUrl: './admin-file-storage-test.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminFileStorageTestComponent implements OnInit {
  private static readonly DESKTOP_PAGE_SIZE = 10;

  private readonly filesApi = inject(StoredFilesApiService);
  private readonly layout = inject(LayoutService);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);

  /** Версія завантаження прев’ю — щоб ігнорувати застарілі відповіді після reload. */
  private previewLoadEpoch = 0;

  readonly displayedColumns = [
    'preview',
    'originalFilename',
    'contentType',
    'sizeBytes',
    'storageKey',
    'createdAt',
    'actions'
  ];

  readonly isLoading = signal(false);
  readonly isUploading = signal(false);
  readonly isDragOver = signal(false);
  readonly loadError = signal<string | null>(null);
  /** Лічильник dragenter/dragleave, щоб не блимало при наведенні на дочірні елементи. */
  private dragDepth = 0;
  readonly storageType = signal<string>('-');
  readonly files = signal<StoredFileContractDto[]>([]);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(AdminFileStorageTestComponent.DESKTOP_PAGE_SIZE);
  /** blob: URL мініатюр за id файлу. */
  readonly previewUrls = signal<ReadonlyMap<string, string>>(new Map());

  readonly pagedFiles = computed(() => {
    const all = this.files();
    const start = this.pageIndex() * this.pageSize();
    return all.slice(start, start + this.pageSize());
  });

  readonly pageSizeOptions = [5, 10, 25, 50];

  constructor() {
    this.destroyRef.onDestroy(() => this.revokeAllPreviews());

    effect(() => {
      const rows = this.pagedFiles();
      void this.ensureImagePreviews(rows);
    });
  }

  ngOnInit(): void {
    if (this.layout.isHandset()) {
      this.pageSize.set(5);
    }
    void this.reload();
  }

  isImage(row: StoredFileContractDto): boolean {
    return (row.contentType ?? '').toLowerCase().startsWith('image/');
  }

  previewUrl(id: string): string | null {
    return this.previewUrls().get(id) ?? null;
  }

  async reload(): Promise<void> {
    this.isLoading.set(true);
    this.loadError.set(null);
    this.revokeAllPreviews();
    try {
      const [info, list] = await Promise.all([
        this.filesApi.storageInfo(),
        this.filesApi.list()
      ]);
      this.storageType.set(info.type);
      this.files.set(list);
      const maxPage = Math.max(0, Math.ceil(list.length / this.pageSize()) - 1);
      if (this.pageIndex() > maxPage) {
        this.pageIndex.set(maxPage);
      }
    } catch {
      this.loadError.set('pages.adminFileStorageTest.loadFailed');
    } finally {
      this.isLoading.set(false);
    }
  }

  private async ensureImagePreviews(rows: StoredFileContractDto[]): Promise<void> {
    const images = rows.filter((row) => this.isImage(row));
    const existing = this.previewUrls();
    const missing = images.filter((row) => !existing.has(row.id));
    if (missing.length === 0) {
      return;
    }

    const epoch = this.previewLoadEpoch;
    const loaded = new Map<string, string>();
    await Promise.all(
      missing.map(async (row) => {
        try {
          const blob = await this.filesApi.downloadBlob(row.id);
          const url = URL.createObjectURL(blob);
          if (epoch !== this.previewLoadEpoch) {
            URL.revokeObjectURL(url);
            return;
          }
          loaded.set(row.id, url);
        } catch {
          // Прев’ю опційне — помилку завантаження не показуємо в банері.
        }
      })
    );

    if (epoch !== this.previewLoadEpoch || loaded.size === 0) {
      for (const url of loaded.values()) {
        URL.revokeObjectURL(url);
      }
      return;
    }

    const next = new Map(this.previewUrls());
    for (const [id, url] of loaded) {
      const previous = next.get(id);
      if (previous) {
        URL.revokeObjectURL(previous);
      }
      next.set(id, url);
    }
    this.previewUrls.set(next);
  }

  private revokeAllPreviews(): void {
    this.previewLoadEpoch += 1;
    for (const url of this.previewUrls().values()) {
      URL.revokeObjectURL(url);
    }
    this.previewUrls.set(new Map());
  }

  onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    void this.upload(file);
  }

  onDragEnter(event: DragEvent): void {
    event.preventDefault();
    if (this.isUploading() || !this.hasFilePayload(event)) {
      return;
    }
    this.dragDepth += 1;
    this.isDragOver.set(true);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = this.isUploading() ? 'none' : 'copy';
    }
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    if (this.isUploading() || !this.hasFilePayload(event)) {
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
    if (this.isUploading()) {
      return;
    }
    const file = event.dataTransfer?.files?.[0];
    if (!file) {
      return;
    }
    void this.upload(file);
  }

  private hasFilePayload(event: DragEvent): boolean {
    const types = event.dataTransfer?.types;
    if (!types) {
      return false;
    }
    return Array.from(types).includes('Files');
  }

  async upload(file: File): Promise<void> {
    this.isUploading.set(true);
    try {
      await this.filesApi.upload(file);
      this.notify('pages.adminFileStorageTest.uploadSuccess');
      await this.reload();
    } catch {
      this.notify('pages.adminFileStorageTest.uploadFailed', 'error');
    } finally {
      this.isUploading.set(false);
    }
  }

  async download(row: StoredFileContractDto): Promise<void> {
    try {
      const blob = await this.filesApi.downloadBlob(row.id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = row.originalFilename || 'file';
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      this.notify('pages.adminFileStorageTest.downloadFailed', 'error');
    }
  }

  async confirmDelete(row: StoredFileContractDto): Promise<void> {
    const confirmed = await firstValueFrom(
      this.dialog
        .open(ConfirmDialogComponent, {
          data: { messageKey: 'pages.adminFileStorageTest.deleteConfirm' }
        })
        .afterClosed()
    );
    if (!confirmed) {
      return;
    }
    try {
      await this.filesApi.delete(row.id);
      this.notify('pages.adminFileStorageTest.deleteSuccess');
      await this.reload();
    } catch {
      this.notify('pages.adminFileStorageTest.deleteFailed', 'error');
    }
  }

  private notify(messageKey: string, kind: 'success' | 'error' = 'success'): void {
    showAppSnack(this.snackBar, this.translate, messageKey, kind);
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
