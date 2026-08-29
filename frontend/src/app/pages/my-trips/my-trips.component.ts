import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { firstValueFrom } from 'rxjs';
import {
  TripContractDto,
  TripExpenseCategoryContract,
  TripExpenseLineContractDto,
  TripExpenseLineInputContract,
  TripExpenseReportContractDto,
  TripStatusContract,
  TripsApiService
} from '../../core/api';
import { LayoutService } from '../../core/layout';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { showAppSnack } from '../../shared/utils/app-snackbar';

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
  selector: 'app-my-trips',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    MatButtonModule,
    MatDialogModule,
    MatExpansionModule,
    MatIconModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatSelectModule,
    MatSnackBarModule,
    MatTableModule
  ],
  templateUrl: './my-trips.component.html',
  styleUrl: './my-trips.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MyTripsComponent {
  private static readonly DESKTOP_PAGE_SIZE = 10;
  private static readonly HANDSET_PAGE_SIZE = 5;

  private readonly tripsApi = inject(TripsApiService);
  private readonly layout = inject(LayoutService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);

  readonly isHandset = this.layout.isHandset;
  readonly pageSizeOptions = [5, 10, 25];
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

  readonly isLoading = signal(false);
  readonly loadError = signal('');
  readonly trips = signal<TripContractDto[]>([]);
  readonly totalElements = signal(0);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(MyTripsComponent.DESKTOP_PAGE_SIZE);

  readonly expandedTripId = signal<string | null>(null);
  readonly detailTrip = signal<TripContractDto | null>(null);
  readonly expenseReport = signal<TripExpenseReportContractDto | null>(null);
  readonly editableLines = signal<EditableExpenseLine[]>([]);
  readonly detailLoading = signal(false);
  readonly expenseBusy = signal(false);

  readonly expenseEditable = computed(() => {
    const trip = this.detailTrip();
    const report = this.expenseReport();
    if (!trip || !report) {
      return false;
    }
    const tripOk = trip.status === 'IN_PROGRESS' || trip.status === 'COMPLETED';
    const reportOk = report.status === 'DRAFT' || report.status === 'REJECTED';
    return tripOk && reportOk;
  });

  constructor() {
    effect(() => {
      this.layout.isHandset();
      this.pageSize.set(
        this.layout.handsetPageSize(
          MyTripsComponent.DESKTOP_PAGE_SIZE,
          MyTripsComponent.HANDSET_PAGE_SIZE
        )
      );
    });
    void this.reload();
  }

  async reload(): Promise<void> {
    this.isLoading.set(true);
    this.loadError.set('');
    try {
      const page = await this.tripsApi.listMy(this.pageIndex(), this.pageSize());
      this.trips.set(page.content);
      this.totalElements.set(page.totalElements);
    } catch {
      this.trips.set([]);
      this.totalElements.set(0);
      this.loadError.set('pages.myTrips.loadFailed');
      this.notify('pages.myTrips.loadFailed', 'error');
    } finally {
      this.isLoading.set(false);
    }
  }

  onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    void this.reload();
  }

  async onPanelOpened(trip: TripContractDto): Promise<void> {
    this.expandedTripId.set(trip.id);
    await this.loadDetail(trip.id);
  }

  onPanelClosed(tripId: string): void {
    if (this.expandedTripId() === tripId) {
      this.expandedTripId.set(null);
      this.detailTrip.set(null);
      this.expenseReport.set(null);
      this.editableLines.set([]);
    }
  }

  statusLabelKey(status: TripStatusContract): string {
    return `pages.myTrips.status.${status}`;
  }

  expenseStatusLabelKey(status: string): string {
    return `pages.myTrips.expenseStatus.${status}`;
  }

  categoryLabelKey(category: TripExpenseCategoryContract): string {
    return `pages.myTrips.expenseCategory.${category}`;
  }

  formatDate(iso: string | null): string {
    if (!iso) {
      return '—';
    }
    const parsed = Date.parse(iso);
    if (Number.isNaN(parsed)) {
      return iso;
    }
    return new Date(parsed).toLocaleDateString();
  }

  formatDateTime(iso: string | null): string {
    if (!iso) {
      return '—';
    }
    const parsed = Date.parse(iso);
    if (Number.isNaN(parsed)) {
      return iso;
    }
    return new Date(parsed).toLocaleString();
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
    const tripId = this.expandedTripId();
    if (!tripId || !this.expenseEditable()) {
      return;
    }
    const lines = this.toExpensePayload();
    if (!lines) {
      this.notify('pages.myTrips.expenseValidationError', 'error');
      return;
    }
    this.expenseBusy.set(true);
    try {
      const report = await this.tripsApi.replaceExpenseLinesMy(tripId, lines);
      this.applyExpenseReport(report);
      this.notify('pages.myTrips.expenseSaved');
    } catch {
      this.notify('pages.myTrips.expenseSaveFailed', 'error');
    } finally {
      this.expenseBusy.set(false);
    }
  }

  async submitExpense(): Promise<void> {
    const tripId = this.expandedTripId();
    if (!tripId) {
      return;
    }
    this.expenseBusy.set(true);
    try {
      const report = await this.tripsApi.submitExpenseMy(tripId);
      this.applyExpenseReport(report);
      this.notify('pages.myTrips.expenseSubmitted');
    } catch {
      this.notify('pages.myTrips.expenseActionFailed', 'error');
    } finally {
      this.expenseBusy.set(false);
    }
  }

  async onReceiptSelected(index: number, event: Event): Promise<void> {
    const tripId = this.expandedTripId();
    const line = this.editableLines()[index];
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!tripId || !line?.id || !file) {
      if (!line?.id) {
        this.notify('pages.myTrips.expenseSaveBeforeReceipt', 'error');
      }
      return;
    }
    this.expenseBusy.set(true);
    try {
      const report = await this.tripsApi.uploadReceiptMy(tripId, line.id, file);
      this.applyExpenseReport(report);
      this.notify('pages.myTrips.receiptUploaded');
    } catch {
      this.notify('pages.myTrips.receiptUploadFailed', 'error');
    } finally {
      this.expenseBusy.set(false);
    }
  }

  async deleteReceipt(index: number): Promise<void> {
    const tripId = this.expandedTripId();
    const line = this.editableLines()[index];
    if (!tripId || !line?.id) {
      return;
    }
    const ok = await firstValueFrom(
      this.dialog
        .open(ConfirmDialogComponent, {
          data: { messageKey: 'pages.myTrips.deleteReceiptConfirm' }
        })
        .afterClosed()
    );
    if (!ok) {
      return;
    }
    this.expenseBusy.set(true);
    try {
      const report = await this.tripsApi.deleteReceiptMy(tripId, line.id);
      this.applyExpenseReport(report);
      this.notify('pages.myTrips.receiptDeleted');
    } catch {
      this.notify('pages.myTrips.receiptDeleteFailed', 'error');
    } finally {
      this.expenseBusy.set(false);
    }
  }

  private async loadDetail(tripId: string): Promise<void> {
    this.detailLoading.set(true);
    try {
      const trip = await this.tripsApi.getMy(tripId);
      this.detailTrip.set(trip);
      try {
        const report = await this.tripsApi.getExpenseReportMy(tripId);
        this.applyExpenseReport(report);
      } catch {
        this.expenseReport.set(null);
        this.editableLines.set([]);
      }
    } catch {
      this.detailTrip.set(null);
      this.expenseReport.set(null);
      this.editableLines.set([]);
      this.notify('pages.myTrips.detailLoadFailed', 'error');
    } finally {
      this.detailLoading.set(false);
    }
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
}
