import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { firstValueFrom } from 'rxjs';
import {
  CountryReferenceApiService,
  CountryReferenceContractDto,
  DocumentTypeListViewContract,
  DocumentTypeReferenceContractDto,
  DocumentTypesApiService
} from '../../core/api';
import { LanguageService } from '../../core/services/language.service';
import { LayoutService } from '../../core/layout';
import { countryReferenceLocalizedName } from '../../core/utils/country-reference-localized-name';
import { documentTypeLocalizedName } from '../../core/utils/document-type-localized-name';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { getHandsetFriendlyDialogConfig } from '../../shared/utils/handset-friendly-dialog-config';
import { showAppSnack } from '../../shared/utils/app-snackbar';
import { DocumentTypeFormDialogComponent } from './document-type-form-dialog.component';

@Component({
  selector: 'app-admin-document-types',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatCardModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatTableModule,
    MatTooltipModule
  ],
  templateUrl: './admin-document-types.component.html',
  styleUrl: './admin-document-types.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminDocumentTypesComponent {
  private static readonly DESKTOP_PAGE_SIZE = 10;
  private static readonly HANDSET_PAGE_SIZE = 5;

  private readonly documentTypesApi = inject(DocumentTypesApiService);
  private readonly countryReferenceApi = inject(CountryReferenceApiService);
  private readonly dialog = inject(MatDialog);
  private readonly formBuilder = inject(FormBuilder);
  private readonly layout = inject(LayoutService);
  private readonly languageService = inject(LanguageService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);

  readonly isHandset = this.layout.isHandset;
  readonly displayedColumns = [
    'name',
    'country',
    'plannedScanPages',
    'fieldCount',
    'status',
    'actions'
  ];
  readonly pageSizeOptions = [5, 10, 25, 50];

  readonly isLoading = signal(false);
  readonly loadError = signal('');
  readonly allDocumentTypes = signal<DocumentTypeReferenceContractDto[]>([]);
  readonly countries = signal<CountryReferenceContractDto[]>([]);
  readonly listView = signal<DocumentTypeListViewContract>('all');
  readonly pageIndex = signal(0);
  readonly pageSize = signal(AdminDocumentTypesComponent.DESKTOP_PAGE_SIZE);

  readonly searchForm = this.formBuilder.nonNullable.group({
    search: [''],
    country: ['']
  });

  readonly countAll = computed(() => this.allDocumentTypes().length);
  readonly countActive = computed(
    () => this.allDocumentTypes().filter((row) => !row.deleted).length
  );
  readonly countDeleted = computed(
    () => this.allDocumentTypes().filter((row) => row.deleted).length
  );

  readonly documentTypes = computed(() => {
    const all = this.allDocumentTypes();
    switch (this.listView()) {
      case 'active':
        return all.filter((row) => !row.deleted);
      case 'deleted':
        return all.filter((row) => row.deleted);
      default:
        return all;
    }
  });

  readonly pagedDocumentTypes = computed(() => {
    const filtered = this.documentTypes();
    const start = this.pageIndex() * this.pageSize();
    return filtered.slice(start, start + this.pageSize());
  });

  readonly countryNameByCode = computed(() => {
    const language = this.languageService.language();
    const map = new Map<string, string>();
    for (const country of this.countries()) {
      map.set(
        country.codeAlpha2.toUpperCase(),
        countryReferenceLocalizedName(country, language)
      );
    }
    return map;
  });

  constructor() {
    effect(() => {
      this.layout.isHandset();
      this.pageSize.set(
        this.layout.handsetPageSize(
          AdminDocumentTypesComponent.DESKTOP_PAGE_SIZE,
          AdminDocumentTypesComponent.HANDSET_PAGE_SIZE
        )
      );
      this.clampPageIndex();
    });

    this.searchForm.controls.search.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(() => void this.reload());

    this.searchForm.controls.country.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(() => void this.reload());

    void this.loadCountries();
    void this.reload();
  }

  async reload(): Promise<void> {
    this.isLoading.set(true);
    this.loadError.set('');
    try {
      const search = this.searchForm.controls.search.value.trim();
      const country = this.searchForm.controls.country.value.trim();
      const list = await this.documentTypesApi.list('all', search || undefined, country || undefined);
      this.allDocumentTypes.set(list);
      this.clampPageIndex();
    } catch {
      this.loadError.set('pages.adminDocumentTypes.loadFailed');
      this.notify('pages.adminDocumentTypes.loadFailed', 'error');
    } finally {
      this.isLoading.set(false);
    }
  }

  onViewChange(view: DocumentTypeListViewContract | undefined): void {
    if (!view) {
      return;
    }
    this.listView.set(view);
    this.pageIndex.set(0);
  }

  onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }

  localizedName(row: DocumentTypeReferenceContractDto): string {
    return documentTypeLocalizedName(row, this.languageService.language());
  }

  countryName(code: string): string {
    return this.countryNameByCode().get(code.toUpperCase()) ?? code.toUpperCase();
  }

  plannedPagesLabel(pages: number): string {
    if (pages === 0) {
      return this.translate.instant('pages.adminDocumentTypes.plannedScanPagesUndefined');
    }
    return String(pages);
  }

  async openCreate(): Promise<void> {
    await this.openFormDialog(null);
  }

  async openEdit(row: DocumentTypeReferenceContractDto): Promise<void> {
    await this.openFormDialog(row);
  }

  async softDelete(row: DocumentTypeReferenceContractDto): Promise<void> {
    const ok = await firstValueFrom(
      this.dialog
        .open(ConfirmDialogComponent, {
          data: { messageKey: 'pages.adminDocumentTypes.deleteConfirm' }
        })
        .afterClosed()
    );
    if (!ok) {
      return;
    }
    try {
      await this.documentTypesApi.softDelete(row.id);
      this.notify('pages.adminDocumentTypes.deleteSuccess');
      await this.reload();
    } catch (err) {
      this.notify(this.mapError(err, 'pages.adminDocumentTypes.deleteFailed'), 'error');
    }
  }

  async restore(row: DocumentTypeReferenceContractDto): Promise<void> {
    const ok = await firstValueFrom(
      this.dialog
        .open(ConfirmDialogComponent, {
          data: { messageKey: 'pages.adminDocumentTypes.restoreConfirm' }
        })
        .afterClosed()
    );
    if (!ok) {
      return;
    }
    try {
      await this.documentTypesApi.restore(row.id);
      this.notify('pages.adminDocumentTypes.restoreSuccess');
      await this.reload();
    } catch (err) {
      this.notify(this.mapError(err, 'pages.adminDocumentTypes.restoreFailed'), 'error');
    }
  }

  private async loadCountries(): Promise<void> {
    try {
      this.countries.set(await this.countryReferenceApi.list());
    } catch {
      // Список країн потрібен лише для підписів; помилку показуємо при reload.
    }
  }

  private clampPageIndex(): void {
    const maxPage = Math.max(0, Math.ceil(this.documentTypes().length / this.pageSize()) - 1);
    if (this.pageIndex() > maxPage) {
      this.pageIndex.set(maxPage);
    }
  }

  private async openFormDialog(
    documentType: DocumentTypeReferenceContractDto | null
  ): Promise<void> {
    const ref = this.dialog.open(
      DocumentTypeFormDialogComponent,
      getHandsetFriendlyDialogConfig({
        width: 'min(920px, calc(100vw - 24px))',
        maxHeight: 'min(92vh, 900px)',
        data: { documentType }
      })
    );
    const changed = await firstValueFrom(ref.afterClosed());
    if (changed) {
      await this.reload();
    }
  }

  private notify(messageKey: string, kind: 'success' | 'error' = 'success'): void {
    showAppSnack(this.snackBar, this.translate, messageKey, kind);
  }

  private mapError(err: unknown, fallback: string): string {
    const code = (err as { error?: { code?: string } })?.error?.code;
    switch (code) {
      case 'DOCUMENT_TYPE_NAME_EXISTS':
        return 'pages.adminDocumentTypes.errors.DOCUMENT_TYPE_NAME_EXISTS';
      case 'DOCUMENT_TYPE_DELETED':
        return 'pages.adminDocumentTypes.errors.DOCUMENT_TYPE_DELETED';
      case 'NOT_FOUND':
        return 'pages.adminDocumentTypes.errors.NOT_FOUND';
      default:
        return fallback;
    }
  }
}
