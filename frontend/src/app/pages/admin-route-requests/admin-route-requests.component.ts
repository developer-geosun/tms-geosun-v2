import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  ViewChild,
  computed,
  effect,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSidenavModule } from '@angular/material/sidenav';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import {
  AdminRouteRequestListParams,
  CostPreviewStartPointContract,
  CreateQuoteContractRequest,
  FreightCostCalculationContractDto,
  FreightNumericScenarioContractDto,
  FreightNumericScenariosApiService,
  QuoteContractDto,
  RouteRequestContractDto,
  RouteRequestsApiService
} from '../../core/api';
import { extractApiError } from '../../core/utils/api-error';
import { isNbuRateError } from '../../core/utils/nbu-rate-error';
import { parseOptionalFormNumber } from '../../core/utils/parse-optional-form-number';
import {
  buildNbuCostPreviewDisplay,
  NbuCostPreviewSource
} from '../../core/utils/freight-cost-preview-display.util';
import { LayoutService } from '../../core/layout';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { getHandsetFriendlyDialogConfig } from '../../shared/utils/handset-friendly-dialog-config';
import {
  SendProposalDialogComponent,
  SendProposalDialogData
} from './send-proposal-dialog.component';
import {
  FilterRouteRequestsDialogComponent,
  FilterRouteRequestsDialogResult
} from './filter-route-requests-dialog.component';
import * as L from 'leaflet';

@Component({
  selector: 'app-admin-route-requests',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatPaginatorModule,
    MatCardModule,
    MatExpansionModule,
    MatIconModule,
    MatSlideToggleModule,
    MatSidenavModule,
    RouterLink
  ],
  templateUrl: './admin-route-requests.component.html',
  styleUrl: './admin-route-requests.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminRouteRequestsComponent implements AfterViewInit, OnDestroy {
  @ViewChild('requestMap', { static: false }) private readonly requestMapElement?: ElementRef<HTMLDivElement>;
  @ViewChild('requestDetails', { static: false })
  private readonly requestDetailsElement?: ElementRef<HTMLElement>;

  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly routeRequestsApi = inject(RouteRequestsApiService);
  private readonly numericScenariosApi = inject(FreightNumericScenariosApiService);
  private readonly layout = inject(LayoutService);

  private static readonly DESKTOP_DEFAULT_PAGE_SIZE = 20;
  private static readonly HANDSET_DEFAULT_PAGE_SIZE = 5;

  /** Попередній handset-стан — effect лише при зміні breakpoint, не при виборі pageSize користувачем. */
  private lastHandsetViewport: boolean | null = null;

  private map: L.Map | null = null;
  private mapRouteLayer: L.Polyline | null = null;
  private mapStartToFirstLayer: L.Polyline | null = null;
  private mapMarkers: L.Marker[] = [];
  private startPointMarker: L.Marker | null = null;
  private startToFirstRouteRequestId = 0;
  private resizeTimers: ReturnType<typeof setTimeout>[] = [];

  readonly isLoading = signal(false);
  readonly loadError = signal('');
  readonly requests = signal<RouteRequestContractDto[]>([]);
  readonly totalElements = signal(0);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(AdminRouteRequestsComponent.DESKTOP_DEFAULT_PAGE_SIZE);
  readonly selectedRequestId = signal<number | null>(null);
  readonly quoteHistory = signal<QuoteContractDto[]>([]);
  readonly quoteLoadError = signal('');
  /** Спливаюча панель редактора + історії пропозицій. */
  readonly quotePanelOpen = signal(false);
  readonly isCreatingQuote = signal(false);
  readonly isSendingQuote = signal(false);
  readonly isCountryBreakdownLoading = signal(false);
  readonly isNbuPreviewLoading = signal(false);
  readonly isDeletingNbuCalculation = signal(false);
  readonly quoteActionError = signal('');
  readonly quoteActionSuccess = signal('');
  readonly nbuActionError = signal('');
  readonly nbuActionErrorDetail = signal('');
  readonly nbuActionSuccess = signal('');
  readonly showNbuRatesLink = signal(false);
  readonly nbuCostSummary = signal('');
  readonly nbuCostHistory = signal<FreightCostCalculationContractDto[]>([]);
  readonly lastNbuPreview = signal<NbuCostPreviewSource | null>(null);

  readonly numericScenarios = signal<FreightNumericScenarioContractDto[]>([]);

  readonly selectedRequest = computed(() =>
    this.requests().find((request) => request.id === this.selectedRequestId()) ?? null
  );
  readonly displayedRoutePoints = computed<DisplayRoutePoint[]>(() => {
    const request = this.selectedRequest();
    const routePoints = request?.route?.points ?? [];
    const sorted = [...routePoints]
      .sort((a, b) => a.order - b.order)
      .map((point) => ({
        order: point.order,
        address: point.address,
        lat: point.lat,
        lng: point.lng
      }));
    const startPoint = this.startPoint();
    if (!startPoint) {
      return sorted;
    }
    return [
      {
        order: 0,
        address: startPoint.address?.trim() || `${startPoint.lat.toFixed(4)}, ${startPoint.lng.toFixed(4)}`,
        lat: startPoint.lat,
        lng: startPoint.lng
      },
      ...sorted
    ];
  });

  readonly nbuCostDisplay = computed(() => {
    const preview = this.lastNbuPreview();
    return preview ? buildNbuCostPreviewDisplay(preview) : null;
  });

  readonly selectedDraftQuote = computed(
    () => this.quoteHistory().find((quote) => quote.status === 'draft') ?? null
  );

  readonly filterForm = this.formBuilder.nonNullable.group({
    status: [''],
    createdFrom: [''],
    createdTo: [''],
    ownerEmail: [''],
    routeTitle: [''],
    sort: ['createdAt'],
    order: ['desc']
  });

  /** true, якщо застосовано параметри, відмінні від дефолтних */
  readonly filtersActive = signal(false);

  readonly quoteDraftForm = this.formBuilder.nonNullable.group({
    currency: ['EUR'],
    totalAmount: [''],
    transitDaysMin: [''],
    transitDaysMax: [''],
    validUntil: [''],
    publicNote: [''],
    internalNote: ['']
  });

  readonly nbuForm = this.formBuilder.nonNullable.group({
    scenarioId: [''],
    calculationDate: [new Date().toISOString().slice(0, 10)],
    useStartPoint: [false],
    startPointAddress: ['']
  });
  readonly startPoint = signal<CostPreviewStartPointContract | null>(null);
  readonly isStartPointGeocoding = signal(false);

  readonly statusOptions = ['new', 'in_review', 'quoted', 'accepted', 'rejected', 'cancelled', 'expired'];

  /** Довідник email власників для випадаючого списку у фільтрі. */
  readonly ownerEmailOptions = signal<string[]>([]);

  constructor() {
    void this.loadNumericScenarios();
    // LayoutService вже має актуальний viewport (root service).
    this.pageSize.set(
      this.layout.handsetPageSize(
        AdminRouteRequestsComponent.DESKTOP_DEFAULT_PAGE_SIZE,
        AdminRouteRequestsComponent.HANDSET_DEFAULT_PAGE_SIZE
      )
    );
    // Тільки коли змінюється handset↔desktop: не перезаписувати вибір pageSize користувача.
    effect(() => {
      const isHandset = this.layout.isHandset();
      const previous = this.lastHandsetViewport;
      this.lastHandsetViewport = isHandset;
      if (previous === null || previous === isHandset) {
        return;
      }
      this.pageSize.set(
        isHandset
          ? AdminRouteRequestsComponent.HANDSET_DEFAULT_PAGE_SIZE
          : AdminRouteRequestsComponent.DESKTOP_DEFAULT_PAGE_SIZE
      );
      this.pageIndex.set(0);
      void this.loadRequests();
    });
    void this.loadRequests();
    effect(() => {
      const request = this.selectedRequest();
      const loading = this.isLoading();
      if (!request || loading) {
        if (!request) {
          this.quoteHistory.set([]);
          this.nbuCostHistory.set([]);
          this.nbuCostSummary.set('');
          this.lastNbuPreview.set(null);
          this.closeQuotePanel();
        }
        return;
      }
      this.scheduleMapUpdate(request);
      void this.loadQuoteHistory(request.id);
      void this.loadNbuCostHistory(request.id);
    });
  }

  ngAfterViewInit(): void {
    const request = this.selectedRequest();
    if (request && !this.isLoading()) {
      this.scheduleMapUpdate(request);
    }
  }

  ngOnDestroy(): void {
    this.resizeTimers.forEach((timer) => clearTimeout(timer));
    this.resizeTimers = [];
    this.disposeMap();
  }

  async loadRequests(): Promise<void> {
    // isLoading знищує #requestMap у шаблоні — відпускаємо Leaflet до зникнення DOM
    this.disposeMap();
    this.isLoading.set(true);
    this.loadError.set('');
    this.quoteActionError.set('');
    this.quoteActionSuccess.set('');
    try {
      const filters = this.filterForm.getRawValue();
      const params: AdminRouteRequestListParams = {
        status: filters.status || undefined,
        createdFrom: filters.createdFrom || undefined,
        createdTo: filters.createdTo || undefined,
        ownerEmail: filters.ownerEmail || undefined,
        routeTitle: filters.routeTitle || undefined,
        sort: filters.sort || 'createdAt',
        order: filters.order === 'asc' ? 'asc' : 'desc',
        page: this.pageIndex(),
        size: this.pageSize()
      };
      const page = await this.routeRequestsApi.getAdminRouteRequests(params);
      this.requests.set(page.content);
      this.totalElements.set(page.totalElements);
      const stillSelected = page.content.some((item) => item.id === this.selectedRequestId());
      if (!stillSelected) {
        this.selectedRequestId.set(page.content[0]?.id ?? null);
      }
      const activeId = this.selectedRequestId();
      if (activeId != null) {
        void this.loadRequestDetails(activeId);
      }
    } catch {
      this.requests.set([]);
      this.selectedRequestId.set(null);
      this.totalElements.set(0);
      this.loadError.set('pages.adminRouteRequests.loadFailed');
    } finally {
      this.isLoading.set(false);
    }
  }

  async applyFilters(): Promise<void> {
    this.filtersActive.set(this.hasActiveFilters());
    this.pageIndex.set(0);
    await this.loadRequests();
  }

  async resetFilters(): Promise<void> {
    this.filterForm.reset({
      status: '',
      createdFrom: '',
      createdTo: '',
      ownerEmail: '',
      routeTitle: '',
      sort: 'createdAt',
      order: 'desc'
    });
    this.filtersActive.set(false);
    this.pageIndex.set(0);
    await this.loadRequests();
  }

  async openFiltersDialog(): Promise<void> {
    await this.loadOwnerEmails();
    const ref = this.dialog.open(
      FilterRouteRequestsDialogComponent,
      getHandsetFriendlyDialogConfig({
        width: 'min(520px, calc(100vw - 24px))',
        maxHeight: 'min(92vh, 760px)',
        data: {
          filters: this.filterForm.getRawValue(),
          statusOptions: this.statusOptions,
          ownerEmailOptions: this.ownerEmailOptions()
        }
      })
    );
    const result = await firstValueFrom(ref.afterClosed()) as
      | FilterRouteRequestsDialogResult
      | undefined;
    if (!result) {
      return;
    }
    if (result.action === 'reset') {
      await this.resetFilters();
      return;
    }
    this.filterForm.patchValue(result.values);
    await this.applyFilters();
  }

  private async loadOwnerEmails(): Promise<void> {
    try {
      this.ownerEmailOptions.set(await this.routeRequestsApi.getAdminRouteRequestOwnerEmails());
    } catch {
      // фільтр залишається робочим із ручним введенням email
      this.ownerEmailOptions.set([]);
    }
  }

  /** Чи відрізняються поточні фільтри від дефолтних (кнопка — інверсний стиль). */
  private hasActiveFilters(): boolean {
    const filters = this.filterForm.getRawValue();
    return (
      !!filters.status.trim() ||
      !!filters.createdFrom.trim() ||
      !!filters.createdTo.trim() ||
      !!filters.ownerEmail.trim() ||
      !!filters.routeTitle.trim() ||
      filters.sort !== 'createdAt' ||
      filters.order !== 'desc'
    );
  }

  async onPageChange(event: PageEvent): Promise<void> {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    await this.loadRequests();
  }

  selectRequest(requestId: number): void {
    this.selectedRequestId.set(requestId);
    this.closeQuotePanel();
    this.quoteActionError.set('');
    this.quoteActionSuccess.set('');
    this.nbuActionError.set('');
    this.nbuActionErrorDetail.set('');
    this.nbuActionSuccess.set('');
    this.showNbuRatesLink.set(false);
    this.nbuCostSummary.set('');
    this.lastNbuPreview.set(null);
    void this.loadRequestDetails(requestId);
    this.scrollDetailsIntoView();
  }

  openQuotePanel(): void {
    this.quotePanelOpen.set(true);
  }

  closeQuotePanel(): void {
    this.quotePanelOpen.set(false);
  }

  /** Прокрутка до блоку деталей після вибору картки в черзі (актуально на handset). */
  private scrollDetailsIntoView(): void {
    // після оновлення DOM (Active CD / content details)
    requestAnimationFrame(() => {
      const el = this.requestDetailsElement?.nativeElement;
      if (!el) {
        return;
      }
      el.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
      // фокус для a11y без видимої обводки (tabindex="-1")
      el.focus({ preventScroll: true });
    });
  }

  /** Сума пропозиції для картки в черзі (лише QUOTED з поточною котировкою). */
  cardQuoteAmount(request: RouteRequestContractDto): string | null {
    if (String(request.status).toLowerCase() !== 'quoted') {
      return null;
    }
    const quote = request.currentQuote;
    if (!quote || !Number.isFinite(quote.totalAmount) || !quote.currency?.trim()) {
      return null;
    }
    const amount = new Intl.NumberFormat('uk-UA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(quote.totalAmount);
    return `${amount} ${quote.currency.trim().toUpperCase()}`;
  }

  // Список повертає запити без точок маршруту (includeRoutePoints=false),
  // тому підвантажуємо повну деталь по id, щоб показати точки та карту.
  private async loadRequestDetails(requestId: number): Promise<void> {
    try {
      const detail = await this.routeRequestsApi.getAdminRouteRequestById(requestId);
      this.requests.update((list) => list.map((item) => (item.id === detail.id ? detail : item)));
    } catch {
      // no-op: залишаємо дані зі списку, точки просто не відобразяться
    }
  }

  async createDraftQuote(): Promise<void> {
    const selected = this.selectedRequest();
    if (!selected) {
      return;
    }
    this.quoteActionError.set('');
    this.quoteActionSuccess.set('');
    const payload = this.toCreateQuotePayload();
    if (!payload) {
      this.quoteActionError.set('pages.adminRouteRequests.quoteValidationError');
      return;
    }

    this.isCreatingQuote.set(true);
    try {
      await this.routeRequestsApi.createAdminQuote(selected.id, payload, this.nextIdempotencyKey('create'));
      await this.loadRequests();
      this.quoteActionSuccess.set('pages.adminRouteRequests.quoteDraftCreated');
    } catch {
      this.quoteActionError.set('pages.adminRouteRequests.quoteCreateFailed');
    } finally {
      this.isCreatingQuote.set(false);
    }
  }

  async sendSelectedDraft(): Promise<void> {
    const draft = this.selectedDraftQuote();
    if (!draft) {
      return;
    }
    this.quoteActionError.set('');
    this.quoteActionSuccess.set('');
    this.isSendingQuote.set(true);
    try {
      await this.routeRequestsApi.sendAdminQuote(draft.id, this.nextIdempotencyKey('send'));
      await this.loadRequests();
      this.quoteActionSuccess.set('pages.adminRouteRequests.quoteSentSuccess');
    } catch {
      this.quoteActionError.set('pages.adminRouteRequests.quoteSendFailed');
    } finally {
      this.isSendingQuote.set(false);
    }
  }

  async runNbuCostPreview(): Promise<void> {
    const selected = this.selectedRequest();
    const scenarioId = this.nbuForm.controls.scenarioId.value.trim();
    const calculationDate = this.nbuForm.controls.calculationDate.value;
    if (!selected || !scenarioId) {
      this.nbuActionError.set('pages.adminRouteRequests.nbuScenarioRequired');
      this.nbuActionErrorDetail.set('');
      return;
    }
    const startPoint = await this.resolveStartPointForPreview();
    if (this.nbuForm.controls.useStartPoint.value && !startPoint) {
      return;
    }
    this.nbuActionError.set('');
    this.nbuActionErrorDetail.set('');
    this.nbuActionSuccess.set('');
    this.showNbuRatesLink.set(false);
    this.isNbuPreviewLoading.set(true);
    try {
      // Backend cost-preview сам перераховує country-breakdown під обраний scenarioId
      const preview = await this.routeRequestsApi.postCostPreview(selected.id, {
        scenarioId,
        calculationDate,
        startPoint: startPoint ?? undefined
      });
      this.applyCostPreview(preview);
      // Оновлюємо заявку (країни/пробіг) після авто-перерахунку breakdown
      await this.loadRequestDetails(selected.id);
      await this.loadNbuCostHistory(selected.id);
      this.nbuActionSuccess.set('pages.adminRouteRequests.nbuPreviewSuccess');
    } catch (error) {
      this.handleNbuActionError(error, 'pages.adminRouteRequests.nbuPreviewFailed');
    } finally {
      this.isNbuPreviewLoading.set(false);
    }
  }

  async viewNbuCalculation(calculationId: string): Promise<void> {
    const selected = this.selectedRequest();
    if (!selected) {
      return;
    }
    this.nbuActionError.set('');
    this.nbuActionErrorDetail.set('');
    this.showNbuRatesLink.set(false);
    try {
      const detail = await this.routeRequestsApi.getCostCalculationById(selected.id, calculationId);
      this.applyCostPreview(detail);
    } catch (error) {
      this.handleNbuActionError(error, 'pages.adminRouteRequests.nbuHistoryLoadFailed');
    }
  }

  async deleteNbuCalculation(calculationId: string, event: Event): Promise<void> {
    event.stopPropagation();
    const selected = this.selectedRequest();
    if (!selected || this.isDeletingNbuCalculation()) {
      return;
    }
    const confirmed = await this.openConfirmDialog('pages.adminRouteRequests.nbuHistoryDeleteConfirm');
    if (!confirmed) {
      return;
    }
    this.nbuActionError.set('');
    this.nbuActionErrorDetail.set('');
    this.nbuActionSuccess.set('');
    this.showNbuRatesLink.set(false);
    this.isDeletingNbuCalculation.set(true);
    try {
      await this.routeRequestsApi.deleteCostCalculation(selected.id, calculationId);
      const preview = this.lastNbuPreview();
      if (preview && this.nbuCalculationId(preview) === calculationId) {
        this.lastNbuPreview.set(null);
        this.nbuCostSummary.set('');
      }
      await this.loadNbuCostHistory(selected.id);
      this.nbuActionSuccess.set('pages.adminRouteRequests.nbuHistoryDeleted');
    } catch (error) {
      this.handleNbuActionError(error, 'pages.adminRouteRequests.nbuHistoryDeleteFailed');
    } finally {
      this.isDeletingNbuCalculation.set(false);
    }
  }

  applyNbuToQuoteDraft(): void {
    const preview = this.lastNbuPreview();
    if (!preview) {
      this.quoteActionError.set('pages.adminRouteRequests.nbuPreviewRequiredForQuote');
      this.openQuotePanel();
      return;
    }
    this.quoteActionError.set('');
    this.quoteDraftForm.patchValue({
      currency: preview.proposalCurrency.trim().toUpperCase(),
      totalAmount: String(preview.totalProposalAmount),
      internalNote: preview.calculationSummary ?? ''
    });
    this.quoteActionSuccess.set('pages.adminRouteRequests.nbuAppliedToQuote');
    this.openQuotePanel();
  }

  async createQuoteFromNbu(): Promise<void> {
    const selected = this.selectedRequest();
    const preview = this.lastNbuPreview();
    const calculationId = this.nbuCalculationId(preview);
    if (!selected || !calculationId) {
      this.quoteActionError.set('pages.adminRouteRequests.nbuPreviewRequiredForQuote');
      this.openQuotePanel();
      return;
    }
    this.quoteActionError.set('');
    this.quoteActionSuccess.set('');
    this.isCreatingQuote.set(true);
    try {
      await this.routeRequestsApi.createAdminQuote(
        selected.id,
        { fromCostCalculationId: calculationId },
        this.nextIdempotencyKey('create')
      );
      await this.loadQuoteHistory(selected.id);
      this.quoteActionSuccess.set('pages.adminRouteRequests.quoteDraftCreatedFromNbu');
      this.openQuotePanel();
    } catch {
      this.quoteActionError.set('pages.adminRouteRequests.quoteCreateFailed');
      this.openQuotePanel();
    } finally {
      this.isCreatingQuote.set(false);
    }
  }

  async openSendProposalDialog(): Promise<void> {
    const selected = this.selectedRequest();
    const preview = this.lastNbuPreview();
    const calculationId = this.nbuCalculationId(preview);
    if (!selected || !preview || !calculationId) {
      this.quoteActionError.set('pages.adminRouteRequests.nbuPreviewRequiredForQuote');
      this.openQuotePanel();
      return;
    }
    const requesterEmail = (selected.requesterEmail ?? '').trim();
    if (!requesterEmail) {
      this.quoteActionError.set('pages.adminRouteRequests.sendProposalNoEmail');
      this.openQuotePanel();
      return;
    }
    this.quoteActionError.set('');
    this.quoteActionSuccess.set('');
    const data: SendProposalDialogData = {
      requestId: selected.id,
      requesterEmail,
      calculationId,
      totalProposalAmount: preview.totalProposalAmount,
      proposalCurrency: preview.proposalCurrency,
      routePoints: [...(selected.route?.points ?? [])].sort((a, b) => a.order - b.order)
    };
    const ref = this.dialog.open(
      SendProposalDialogComponent,
      getHandsetFriendlyDialogConfig({
        width: 'min(640px, calc(100vw - 24px))',
        maxHeight: 'min(92vh, 760px)',
        disableClose: true,
        data
      })
    );
    const sent = await firstValueFrom(ref.afterClosed());
    if (sent) {
      await this.loadRequests();
      await this.loadQuoteHistory(selected.id);
      this.quoteActionSuccess.set('pages.adminRouteRequests.sendProposalSuccess');
      this.openQuotePanel();
    }
  }

  async copyNbuSummary(): Promise<void> {
    const text = this.nbuCostSummary().trim();
    if (!text) {
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      this.nbuActionSuccess.set('pages.adminRouteRequests.nbuSummaryCopied');
    } catch {
      this.nbuActionError.set('pages.adminRouteRequests.nbuSummaryCopyFailed');
    }
  }

  /** Закриває картку підсумку розрахунку (UI), історія на сервері залишається. */
  closeNbuSummary(): void {
    this.lastNbuPreview.set(null);
    this.nbuCostSummary.set('');
  }

  async backToMain(): Promise<void> {
    await this.router.navigate(['/main']);
  }

  private async loadNumericScenarios(): Promise<void> {
    try {
      this.numericScenarios.set(await this.numericScenariosApi.list(true));
    } catch {
      this.numericScenarios.set([]);
    }
  }

  private async loadNbuCostHistory(requestId: number): Promise<void> {
    try {
      this.nbuCostHistory.set(await this.routeRequestsApi.listCostCalculations(requestId));
    } catch {
      this.nbuCostHistory.set([]);
    }
  }

  private applyCostPreview(preview: NbuCostPreviewSource): void {
    this.lastNbuPreview.set(preview);
    this.nbuCostSummary.set(preview.calculationSummary ?? '');
  }

  private nbuCalculationId(preview: NbuCostPreviewSource | null): string | null {
    if (!preview) {
      return null;
    }
    if ('calculationId' in preview && preview.calculationId) {
      return preview.calculationId;
    }
    if ('id' in preview && preview.id) {
      return preview.id;
    }
    return null;
  }

  formatNbuMoney(value: number | null, currency: string): string {
    if (value == null) {
      return '—';
    }
    return `${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
  }

  formatCountryDistanceKm(distanceMeters: number): string {
    if (!Number.isFinite(distanceMeters)) {
      return '0.0';
    }
    return (distanceMeters / 1000).toLocaleString(undefined, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    });
  }

  formatCountryDistanceTotalKm(
    countryDistances: readonly { distanceMeters: number }[] | null | undefined
  ): string {
    if (!countryDistances?.length) {
      return '0.0';
    }
    const totalMeters = countryDistances.reduce(
      (sum, row) => sum + (Number.isFinite(row.distanceMeters) ? row.distanceMeters : 0),
      0
    );
    return this.formatCountryDistanceKm(totalMeters);
  }

  private handleNbuActionError(error: unknown, fallbackKey: string): void {
    if (isNbuRateError(error)) {
      this.nbuActionError.set('pages.adminRouteRequests.nbuRatesMissing');
      this.nbuActionErrorDetail.set('');
      this.showNbuRatesLink.set(true);
      return;
    }
    const apiError = extractApiError(error);
    this.nbuActionError.set(fallbackKey);
    this.nbuActionErrorDetail.set(apiError.message ?? '');
  }

  private openConfirmDialog(messageKey: string): Promise<boolean> {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: { messageKey }
    });
    return firstValueFrom(ref.afterClosed()).then((result) => Boolean(result));
  }

  private async loadQuoteHistory(requestId: number): Promise<void> {
    this.quoteLoadError.set('');
    try {
      const history = await this.routeRequestsApi.getAdminQuotesHistory(requestId);
      this.quoteHistory.set(history);
    } catch {
      this.quoteHistory.set([]);
      this.quoteLoadError.set('pages.adminRouteRequests.quoteHistoryLoadFailed');
    }
  }

  private toCreateQuotePayload(): CreateQuoteContractRequest | null {
    const values = this.quoteDraftForm.getRawValue();
    const totalAmount = Number(values.totalAmount);
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      return null;
    }
    return {
      currency: values.currency.trim().toUpperCase() || 'EUR',
      totalAmount,
      transitDaysMin: parseOptionalFormNumber(values.transitDaysMin),
      transitDaysMax: parseOptionalFormNumber(values.transitDaysMax),
      validUntil: values.validUntil.trim() || null,
      publicNote: values.publicNote.trim() || null,
      internalNote: values.internalNote.trim() || null
    };
  }

  private nextIdempotencyKey(prefix: 'create' | 'send'): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  private scheduleMapUpdate(request: RouteRequestContractDto): void {
    this.resizeTimers.forEach((timer) => clearTimeout(timer));
    this.resizeTimers = [];
    this.initializeMapWhenContainerReady(() => this.renderMapForRequest(request));
  }

  private initializeMapWhenContainerReady(onReady: () => void, attempt = 0): void {
    if (!this.requestMapElement) {
      if (attempt >= 30) {
        return;
      }
      const timer = setTimeout(() => this.initializeMapWhenContainerReady(onReady, attempt + 1), 50);
      this.resizeTimers.push(timer);
      return;
    }

    const container = this.requestMapElement.nativeElement;
    const hasSize = container.clientWidth > 0 && container.clientHeight > 0;
    if (!hasSize && attempt < 30) {
      const timer = setTimeout(() => this.initializeMapWhenContainerReady(onReady, attempt + 1), 50);
      this.resizeTimers.push(timer);
      return;
    }

    this.ensureMapInitialized();
    onReady();
    this.scheduleMapResizeFix();
  }

  private disposeMap(): void {
    this.mapRouteLayer = null;
    this.mapStartToFirstLayer = null;
    this.mapMarkers = [];
    this.startPointMarker = null;
    this.map?.remove();
    this.map = null;
  }

  private ensureMapInitialized(): void {
    const el = this.requestMapElement?.nativeElement;
    if (!el) {
      return;
    }

    // Після пагінації Angular створює новий div, а this.map лишається прив’язаним до старого
    if (this.map && this.map.getContainer() !== el) {
      this.disposeMap();
    }

    if (this.map) {
      return;
    }

    this.map = L.map(el, { zoomControl: true }).setView([50.4501, 30.5234], 5);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; GeoSun'
    }).addTo(this.map);
    this.map.on('click', async (event: L.LeafletMouseEvent) => {
      if (!this.nbuForm.controls.useStartPoint.value) {
        return;
      }
      await this.setStartPointFromMap(event.latlng.lat, event.latlng.lng);
    });
  }

  private scheduleMapResizeFix(): void {
    const delays = [0, 100, 300];
    this.resizeTimers.push(
      ...delays.map((delay) =>
        setTimeout(() => {
          this.map?.invalidateSize();
        }, delay)
      )
    );
    requestAnimationFrame(() => {
      this.map?.invalidateSize();
    });
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.scheduleMapResizeFix();
  }

  /** Після розгортання панелі карта могла мати нульовий розмір — оновлюємо Leaflet. */
  onRoutePointsPanelExpanded(): void {
    const request = this.selectedRequest();
    if (request && !this.isLoading()) {
      this.scheduleMapUpdate(request);
      return;
    }
    this.scheduleMapResizeFix();
  }

  private renderMapForRequest(request: RouteRequestContractDto): void {
    if (!this.map || !request.route) {
      return;
    }

    if (this.mapRouteLayer) {
      this.map.removeLayer(this.mapRouteLayer);
      this.mapRouteLayer = null;
    }
    if (this.mapStartToFirstLayer) {
      this.map.removeLayer(this.mapStartToFirstLayer);
      this.mapStartToFirstLayer = null;
    }
    this.mapMarkers.forEach((marker) => marker.remove());
    this.mapMarkers = [];

    const points = [...request.route.points].sort((a, b) => a.order - b.order);
    if (!points.length) {
      this.syncStartPointMarker();
      return;
    }

    this.mapMarkers = points.map((point) =>
      L.marker([point.lat, point.lng], {
        icon: this.createRoutePointIcon(point.order, point.isBorder)
      })
        .addTo(this.map!)
        .bindPopup(`${point.order}. ${point.address}`)
    );

    const latLngs = this.parseRoutePolyline(request.route.routePolyline, points);
    if (latLngs.length > 1) {
      this.mapRouteLayer = L.polyline(latLngs, { color: '#2563eb', weight: 4, opacity: 0.75 }).addTo(this.map);
      this.map.fitBounds(this.mapRouteLayer.getBounds(), { padding: [30, 30] });
      this.syncStartPointMarker();
      return;
    }

    const group = L.featureGroup(this.mapMarkers);
    this.map.fitBounds(group.getBounds(), { padding: [30, 30] });
    this.syncStartPointMarker();
  }

  private parseRoutePolyline(routePolyline: string, points: { lat: number; lng: number }[]): L.LatLng[] {
    try {
      const parsed = JSON.parse(routePolyline) as [number, number][];
      if (Array.isArray(parsed)) {
        return parsed
          .filter((item) => Array.isArray(item) && item.length === 2)
          .map((item) => L.latLng(item[0], item[1]));
      }
    } catch {
      // no-op
    }

    if (routePolyline.includes(';')) {
      return routePolyline
        .split(';')
        .map((chunk) => chunk.split(',').map((value) => Number(value.trim())))
        .filter((coords) => coords.length === 2 && Number.isFinite(coords[0]) && Number.isFinite(coords[1]))
        .map((coords) => L.latLng(coords[0], coords[1]));
    }

    return points.map((point) => L.latLng(point.lat, point.lng));
  }

  private createRoutePointIcon(order: number, isBorder: boolean): L.DivIcon {
    const bgColor = isBorder ? '#16a34a' : '#2563eb';
    return L.divIcon({
      html: `<div style="width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:${bgColor};color:#ffffff;font-size:11px;font-weight:700;line-height:1;">${order}</div>`,
      className: 'admin-route-point-icon',
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });
  }

  private createStartPointIcon(): L.DivIcon {
    return L.divIcon({
      html: '<div style="width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#dc2626;color:#ffffff;font-size:11px;font-weight:700;line-height:1;">0</div>',
      className: 'admin-route-point-icon',
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });
  }

  async onStartPointToggleChange(): Promise<void> {
    if (!this.nbuForm.controls.useStartPoint.value) {
      this.clearStartPoint();
    }
  }

  async setStartPointFromAddress(): Promise<void> {
    const rawAddress = this.nbuForm.controls.startPointAddress.value.trim();
    if (!rawAddress) {
      this.nbuActionError.set('pages.adminRouteRequests.startPointAddressRequired');
      return;
    }
    this.nbuActionError.set('');
    this.isStartPointGeocoding.set(true);
    try {
      const geocoded = await this.geocodeAddress(rawAddress);
      if (!geocoded) {
        this.nbuActionError.set('pages.adminRouteRequests.startPointGeocodeFailed');
        return;
      }
      this.startPoint.set({ lat: geocoded.lat, lng: geocoded.lng, address: geocoded.address });
      this.nbuForm.controls.startPointAddress.setValue(geocoded.address);
      this.syncStartPointMarker();
      await this.autoRecalculateCountryBreakdown();
    } catch {
      this.nbuActionError.set('pages.adminRouteRequests.startPointGeocodeFailed');
    } finally {
      this.isStartPointGeocoding.set(false);
    }
  }

  clearStartPoint(): void {
    this.startPoint.set(null);
    this.nbuForm.controls.startPointAddress.setValue('');
    this.syncStartPointMarker();
  }

  private async resolveStartPointForPreview(): Promise<CostPreviewStartPointContract | null> {
    if (!this.nbuForm.controls.useStartPoint.value) {
      return null;
    }
    const selected = this.startPoint();
    if (selected) {
      return selected;
    }
    const byAddress = this.nbuForm.controls.startPointAddress.value.trim();
    if (!byAddress) {
      this.nbuActionError.set('pages.adminRouteRequests.startPointRequired');
      return null;
    }
    await this.setStartPointFromAddress();
    return this.startPoint();
  }

  private async setStartPointFromMap(lat: number, lng: number): Promise<void> {
    this.nbuActionError.set('');
    this.isStartPointGeocoding.set(true);
    try {
      const reverse = await this.reverseGeocode(lat, lng);
      this.startPoint.set({ lat, lng, address: reverse.address });
      this.nbuForm.controls.startPointAddress.setValue(reverse.address);
      this.syncStartPointMarker();
    } catch {
      this.startPoint.set({ lat, lng, address: `${lat.toFixed(4)}, ${lng.toFixed(4)}` });
      this.nbuForm.controls.startPointAddress.setValue(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      this.syncStartPointMarker();
    } finally {
      this.isStartPointGeocoding.set(false);
    }
    await this.autoRecalculateCountryBreakdown();
  }

  private async autoRecalculateCountryBreakdown(): Promise<void> {
    if (!this.nbuForm.controls.useStartPoint.value) {
      return;
    }
    const selected = this.selectedRequest();
    const scenarioId = this.nbuForm.controls.scenarioId.value.trim();
    if (!selected || !scenarioId) {
      return;
    }
    this.isCountryBreakdownLoading.set(true);
    try {
      const updated = await this.routeRequestsApi.postAdminCountryBreakdown(selected.id, { scenarioId });
      this.requests.update((list) => list.map((item) => (item.id === updated.id ? updated : item)));
      this.nbuActionSuccess.set('pages.adminRouteRequests.countryBreakdownSuccess');
      this.nbuActionError.set('');
      this.nbuActionErrorDetail.set('');
    } catch (error) {
      this.handleNbuActionError(error, 'pages.adminRouteRequests.countryBreakdownFailed');
    } finally {
      this.isCountryBreakdownLoading.set(false);
    }
  }

  private syncStartPointMarker(): void {
    if (!this.map) {
      return;
    }
    const firstRoutePoint = this.firstRoutePoint();
    const point = this.startPoint();
    if (!point) {
      this.startPointMarker?.remove();
      this.startPointMarker = null;
      this.mapStartToFirstLayer?.remove();
      this.mapStartToFirstLayer = null;
      return;
    }
    if (!this.startPointMarker) {
      this.startPointMarker = L.marker([point.lat, point.lng], {
        draggable: true,
        icon: this.createStartPointIcon()
      }).addTo(this.map);
      this.startPointMarker.bindPopup('Start point');
      this.startPointMarker.on('dragend', async () => {
        if (!this.startPointMarker) {
          return;
        }
        const p = this.startPointMarker.getLatLng();
        await this.setStartPointFromMap(p.lat, p.lng);
      });
    } else {
      this.startPointMarker.setLatLng([point.lat, point.lng]);
    }
    if (!firstRoutePoint) {
      this.mapStartToFirstLayer?.remove();
      this.mapStartToFirstLayer = null;
      return;
    }
    void this.renderStartToFirstRoadRoute(point.lat, point.lng, firstRoutePoint.lat, firstRoutePoint.lng);
  }

  private firstRoutePoint(): { lat: number; lng: number } | null {
    const request = this.selectedRequest();
    const points = request?.route?.points ?? [];
    const first = [...points].sort((a, b) => a.order - b.order)[0];
    return first ? { lat: first.lat, lng: first.lng } : null;
  }

  private async renderStartToFirstRoadRoute(
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number
  ): Promise<void> {
    if (!this.map) {
      return;
    }
    const requestId = ++this.startToFirstRouteRequestId;
    const roadLine = await this.fetchRoadRouteLine(startLat, startLng, endLat, endLng);
    if (requestId !== this.startToFirstRouteRequestId || !this.map) {
      return;
    }
    const fallbackLine: L.LatLngExpression[] = [
      [startLat, startLng],
      [endLat, endLng]
    ];
    const latLngs = roadLine.length > 1 ? roadLine : fallbackLine;
    if (!this.mapStartToFirstLayer) {
      this.mapStartToFirstLayer = L.polyline(latLngs, { color: '#dc2626', weight: 4, opacity: 0.9 }).addTo(this.map);
      return;
    }
    this.mapStartToFirstLayer.setLatLngs(latLngs);
  }

  private async fetchRoadRouteLine(
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number
  ): Promise<L.LatLngExpression[]> {
    try {
      const coords = `${startLng},${startLat};${endLng},${endLat}`;
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false`
      );
      if (!response.ok) {
        return [];
      }
      const payload = (await response.json()) as OsrmResponse;
      const route = payload.routes?.[0];
      const coordinates = route?.geometry?.coordinates ?? [];
      if (!Array.isArray(coordinates) || coordinates.length < 2) {
        return [];
      }
      return coordinates
        .filter(
          (item) =>
            Array.isArray(item) &&
            item.length === 2 &&
            Number.isFinite(Number(item[0])) &&
            Number.isFinite(Number(item[1]))
        )
        .map((item) => [Number(item[1]), Number(item[0])] as L.LatLngExpression);
    } catch {
      return [];
    }
  }

  private async geocodeAddress(address: string): Promise<{ lat: number; lng: number; address: string } | null> {
    const lang = 'ru';
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&accept-language=${lang}&addressdetails=1`
    );
    if (!response.ok) {
      return null;
    }
    const payload = (await response.json()) as NominatimResult[];
    const first = payload[0];
    if (!first) {
      return null;
    }
    const lat = Number(first.lat);
    const lng = Number(first.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return null;
    }
    return { lat, lng, address: first.display_name ?? address };
  }

  private async reverseGeocode(lat: number, lng: number): Promise<{ address: string }> {
    const lang = 'ru';
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=${lang}&addressdetails=1`
    );
    if (!response.ok) {
      return { address: `${lat.toFixed(4)}, ${lng.toFixed(4)}` };
    }
    const payload = (await response.json()) as NominatimResult;
    return { address: payload.display_name ?? `${lat.toFixed(4)}, ${lng.toFixed(4)}` };
  }
}

interface NominatimResult {
  lat?: string;
  lon?: string;
  display_name?: string;
}

interface DisplayRoutePoint {
  order: number;
  address: string;
  lat: number;
  lng: number;
}

interface OsrmResponse {
  routes?: {
    geometry?: {
      coordinates?: [number, number][];
    };
  }[];
}
