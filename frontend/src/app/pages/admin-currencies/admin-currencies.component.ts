import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule, Sort } from '@angular/material/sort';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import {
  CurrenciesApiService,
  CurrencyContractDto,
  NbuRatesSnapshotContractDto
} from '../../core/api';
import { LayoutService } from '../../core/layout';

@Component({
  selector: 'app-admin-currencies',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    MatButtonModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatSlideToggleModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './admin-currencies.component.html',
  styleUrl: './admin-currencies.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminCurrenciesComponent implements AfterViewInit {
  private static readonly DESKTOP_DEFAULT_PAGE_SIZE = 10;
  private static readonly HANDSET_DEFAULT_PAGE_SIZE = 5;

  private readonly currenciesApi = inject(CurrenciesApiService);
  private readonly layout = inject(LayoutService);
  private readonly formBuilder = inject(FormBuilder);

  readonly displayedColumns = [
    'code',
    'nameUk',
    'nbuUnits',
    'ratePerUnit',
    'rateDate',
    'isActive'
  ];
  readonly nbuSnapshotColumns = ['currencyCode', 'nbuUnits', 'ratePerUnit'];
  readonly dataSource = new MatTableDataSource<CurrencyContractDto>([]);
  readonly nbuSnapshotSource = new MatTableDataSource<NbuRatesSnapshotContractDto['rates'][number]>([]);
  readonly pageSizeOptions = [5, 10, 15, 25, 50];
  readonly pageSize = signal(AdminCurrenciesComponent.DESKTOP_DEFAULT_PAGE_SIZE);

  readonly isLoading = signal(false);
  readonly isSyncing = signal(false);
  readonly isLoadingNbuSnapshot = signal(false);
  readonly loadError = signal('');
  readonly actionError = signal('');
  readonly actionSuccess = signal('');
  readonly nbuSnapshotError = signal('');
  readonly currencies = signal<CurrencyContractDto[]>([]);
  readonly nbuSnapshot = signal<NbuRatesSnapshotContractDto | null>(null);
  readonly updatingCodes = signal<Set<string>>(new Set());

  readonly rateDateForm = this.formBuilder.nonNullable.group({
    rateDate: [new Date().toISOString().slice(0, 10)]
  });

  @ViewChild(MatPaginator) private paginator?: MatPaginator;
  @ViewChild(MatSort) private sort?: MatSort;

  constructor() {
    this.dataSource.sortData = this.sortCurrencies.bind(this);
    effect(() => {
      this.layout.isHandset();
      this.applyDefaultPageSizeForViewport();
    });
    void this.reload();
  }

  ngAfterViewInit(): void {
    if (this.paginator) {
      this.dataSource.paginator = this.paginator;
    }
    if (this.sort) {
      this.dataSource.sort = this.sort;
    }
    this.applyDefaultPageSizeForViewport();
    this.refreshTableData();
  }

  async reload(): Promise<void> {
    this.isLoading.set(true);
    this.loadError.set('');
    try {
      const currencies = await this.currenciesApi.list(false);
      this.currencies.set(currencies);
      this.refreshTableData();
    } catch {
      this.loadError.set('pages.adminCurrencies.loadFailed');
      this.currencies.set([]);
      this.refreshTableData();
    } finally {
      this.isLoading.set(false);
    }
  }

  async loadNbuRatesByDate(): Promise<void> {
    const rateDate = this.rateDateForm.controls.rateDate.value.trim();
    if (!rateDate) {
      return;
    }
    this.isLoadingNbuSnapshot.set(true);
    this.nbuSnapshotError.set('');
    this.nbuSnapshot.set(null);
    try {
      const snapshot = await this.currenciesApi.getNbuRates(rateDate);
      this.nbuSnapshot.set(snapshot);
      this.nbuSnapshotSource.data = snapshot.rates;
    } catch {
      this.nbuSnapshotError.set('pages.adminCurrencies.nbuRatesLoadFailed');
      this.nbuSnapshotSource.data = [];
    } finally {
      this.isLoadingNbuSnapshot.set(false);
    }
  }

  async syncNbuRates(): Promise<void> {
    this.isSyncing.set(true);
    this.actionError.set('');
    this.actionSuccess.set('');
    try {
      await this.currenciesApi.syncNbuRates();
      await this.reload();
      this.actionSuccess.set('pages.adminCurrencies.syncSuccess');
    } catch {
      this.actionError.set('pages.adminCurrencies.syncFailed');
    } finally {
      this.isSyncing.set(false);
    }
  }

  async toggleActive(row: CurrencyContractDto, isActive: boolean): Promise<void> {
    const code = row.code;
    this.updatingCodes.update((set) => new Set(set).add(code));
    this.actionError.set('');
    try {
      const updated = await this.currenciesApi.update(code, { isActive });
      this.currencies.update((list) =>
        list.map((item) => (item.code === code ? updated : item))
      );
      this.refreshTableData();
    } catch {
      this.actionError.set('pages.adminCurrencies.updateFailed');
    } finally {
      this.updatingCodes.update((set) => {
        const next = new Set(set);
        next.delete(code);
        return next;
      });
    }
  }

  isUpdating(code: string): boolean {
    return this.updatingCodes().has(code);
  }

  formatRate(value: number | null | undefined): string {
    if (value == null) {
      return '—';
    }
    return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 });
  }

  formatFetchedAt(iso: string | undefined): string {
    if (!iso) {
      return '—';
    }
    const parsed = Date.parse(iso);
    if (Number.isNaN(parsed)) {
      return iso;
    }
    return new Date(parsed).toLocaleString();
  }

  private applyDefaultPageSizeForViewport(): void {
    const size = this.layout.handsetPageSize(
      AdminCurrenciesComponent.DESKTOP_DEFAULT_PAGE_SIZE,
      AdminCurrenciesComponent.HANDSET_DEFAULT_PAGE_SIZE
    );
    this.pageSize.set(size);
    if (this.paginator) {
      this.paginator.pageSize = size;
      this.paginator.pageIndex = 0;
    }
  }

  private refreshTableData(): void {
    this.dataSource.data = this.currencies();
    this.paginator?.firstPage();
  }

  private sortCurrencies(data: CurrencyContractDto[], sort: Sort): CurrencyContractDto[] {
    if (!sort.active || sort.direction === '') {
      return data;
    }

    const direction = sort.direction === 'asc' ? 1 : -1;
    return [...data].sort((a, b) => direction * this.compareSortValues(a, b, sort.active));
  }

  private compareSortValues(a: CurrencyContractDto, b: CurrencyContractDto, column: string): number {
    switch (column) {
      case 'code':
        return a.code.localeCompare(b.code);
      case 'nameUk':
        return a.nameUk.localeCompare(b.nameUk, 'uk');
      case 'ratePerUnit':
        return this.compareNullableNumbers(a.latestNbuRatePerUnit, b.latestNbuRatePerUnit);
      case 'isActive':
        return Number(a.isActive) - Number(b.isActive);
      default:
        return 0;
    }
  }

  private compareNullableNumbers(
    a: number | null | undefined,
    b: number | null | undefined
  ): number {
    if (a == null && b == null) {
      return 0;
    }
    if (a == null) {
      return 1;
    }
    if (b == null) {
      return -1;
    }
    return a - b;
  }
}
