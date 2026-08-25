import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  QueryList,
  ViewChild,
  ViewChildren,
  computed,
  effect,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import * as L from 'leaflet';
import {
  BackendApiService,
  RoutePointContract,
  RouteSnapshotContractDto,
  RouteSummaryContractDto,
  RoutesApiService
} from '../../core/api';
import { CHECKPOINTS_DATA } from '../../shared/constants/border-checkpoints.data';
import {
  Checkpoint,
  FreightLang,
  ROUTE_POINT_OPERATIONS,
  RoutePointOperation,
  Waypoint
} from './route-builder.models';
import { hasPendingBorderCheckpoint } from './route-builder.utils';
import {
  RoutePointOperationsError,
  checkSetOperationsForPoint,
  getAllowedOperationsForPoint,
  validateWaypointOperations
} from './route-point-operations.utils';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Subscription } from 'rxjs';
import { RouteDeleteConfirmDialogComponent, getRouteFreightRequestDialogConfig, RouteFreightRequestDialogComponent } from '../../shared/components';
import { LayoutService } from '../../core/layout';

@Component({
  selector: 'app-route-builder',
  templateUrl: './route-builder.component.html',
  styleUrls: ['./route-builder.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatCheckboxModule,
    MatChipsModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ]
})
export class RouteBuilderComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer', { static: true }) private readonly mapContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('pointsListContainer') private readonly pointsListContainer?: ElementRef<HTMLDivElement>;
  @ViewChildren('pointRowRef') private readonly pointRows?: QueryList<ElementRef<HTMLDivElement>>;
  @ViewChildren('borderPickerRef') private readonly borderPickers?: QueryList<ElementRef<HTMLDivElement>>;

  private readonly formBuilder = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly backendApi = inject(BackendApiService);
  private readonly routesApi = inject(RoutesApiService);
  private readonly dialog = inject(MatDialog);
  private readonly translate = inject(TranslateService);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly layout = inject(LayoutService);

  readonly waypoints = signal<Waypoint[]>([]);
  readonly segmentDistances = signal<number[]>([]);
  readonly searchResults = signal<NominatimResult[]>([]);
  readonly highlightedSearchIndex = signal(-1);
  readonly selectedWaypointIndex = signal<number | null>(null);
  readonly selectedCountryBySegment = signal<Record<number, string | null>>({});
  readonly isSearching = signal(false);
  readonly isSavingRoute = signal(false);
  readonly isDuplicatingRoute = signal(false);
  readonly isLoadingSavedRoute = signal(false);
  readonly myRoutes = signal<RouteSummaryContractDto[]>([]);
  readonly toastMessage = signal('');
  readonly toastMessageParams = signal<Record<string, unknown>>({});
  readonly borderCheckpointSelectValue = signal<Record<number, string>>({});
  /** Вузький екран: перемикання панелі маршруту та карти (брейкпоинт як у SCSS). */
  readonly compactRouteLayout = signal(false);
  /** У режимі compact: true — на весь екран карта, false — тільки сайдбар. */
  readonly mobileMapPanelOpen = signal(false);
  readonly mode = signal<RouteBuilderMode>('create');
  readonly editBaselineSignature = signal<string | null>(null);
  readonly lastSavedAt = signal<string | null>(null);
  readonly routeTimestamps = signal<{ createdAt: string | null; updatedAt: string | null; lastOpenedAt: string | null }>({
    createdAt: null,
    updatedAt: null,
    lastOpenedAt: null
  });
  /** Маршрут не можна змінювати після створення заявки (блок на бекенді). */
  readonly routeLockedByRequest = signal(false);

  /** Коментар маршруту при збереженні знімка (не плутати з коментарем у заявці на фрахт). */
  readonly requestForm = this.formBuilder.nonNullable.group({
    routeComment: ['']
  });

  readonly totalDistanceMeters = computed(() => this.segmentDistances().reduce((sum, distance) => sum + distance, 0));
  readonly hasRoute = computed(() => this.waypoints().length >= 2);
  readonly hasAnySelectedOperations = computed(() =>
    this.waypoints().some((point) => (point.operations?.length ?? 0) > 0)
  );
  readonly hasPendingBorder = computed(() => hasPendingBorderCheckpoint(this.waypoints()));
  readonly isViewMode = computed(() => this.mode() === 'view');
  readonly isEditMode = computed(() => this.mode() === 'edit');
  readonly isCreateMode = computed(() => this.mode() === 'create');
  readonly hasEditRouteChanges = computed(() => {
    if (!this.isEditMode()) {
      return true;
    }
    const baseline = this.editBaselineSignature();
    if (!baseline) {
      return false;
    }
    return this.buildEditableRouteSignature() !== baseline;
  });
  readonly canEditRoute = computed(
    () => (this.isEditMode() || this.isCreateMode()) && !this.routeLockedByRequest()
  );
  readonly isRouteInteractionLocked = computed(() => this.canEditRoute() && this.hasPendingBorder());
  readonly operationsValidationError = computed<RoutePointOperationsError | null>(() =>
    validateWaypointOperations(this.waypoints())
  );
  readonly hasOperationsError = computed(() => this.operationsValidationError() !== null);
  readonly allOperations = ROUTE_POINT_OPERATIONS;
  readonly lang = computed<FreightLang>(() => {
    const current = this.translate.currentLang || this.translate.getDefaultLang() || 'uk';
    return (['uk', 'ru', 'en'].includes(current) ? current : 'uk') as FreightLang;
  });

  private map: L.Map | null = null;
  private markers: L.Marker[] = [];
  private routeLayer: L.Polyline | null = null;
  private searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private resizeTimers: ReturnType<typeof setTimeout>[] = [];
  private wasRouteInteractionLocked = false;
  private queryParamsSubscription: Subscription | null = null;

  constructor() {
    effect(() => {
      const compact = this.layout.isCompactSplit();
      this.compactRouteLayout.set(compact);
      if (!compact) {
        this.mobileMapPanelOpen.set(false);
      }
    });

    effect(() => {
      const points = this.waypoints();
      const selectedIndex = this.selectedWaypointIndex();
      this.rebuildMarkers(points, selectedIndex);
    });
    effect(() => {
      const points = this.waypoints();
      const normalized = this.normalizeWaypointOperations(points);
      const hasChanges = normalized.some((point, index) => {
        const currentOps = points[index]?.operations ?? [];
        if (currentOps.length !== point.operations.length) {
          return true;
        }
        return currentOps.some((op, opIndex) => op !== point.operations[opIndex]);
      });
      if (!hasChanges) {
        return;
      }
      // Автоматично прибираємо операції, які стали прихованими або недопустимими.
      this.waypoints.set(normalized);
    });
    effect(() => {
      const isLocked = this.isRouteInteractionLocked();
      if (isLocked && !this.wasRouteInteractionLocked) {
        this.scrollFirstBorderPickerIntoView();
      }
      this.wasRouteInteractionLocked = isLocked;
    });
  }

  ngAfterViewInit(): void {
    this.initializeMapWhenContainerReady();
    this.queryParamsSubscription = this.activatedRoute.queryParamMap.subscribe((params) => {
      void this.loadRouteFromQuery(params);
    });
  }

  ngOnDestroy(): void {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
    this.queryParamsSubscription?.unsubscribe();
    this.resizeTimers.forEach((timer) => clearTimeout(timer));
    this.map?.remove();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.scheduleMapResizeFix();
  }

  openMobileMapPanel(): void {
    if (!this.compactRouteLayout()) {
      return;
    }
    this.mobileMapPanelOpen.set(true);
    requestAnimationFrame(() => {
      this.scheduleMapResizeFix();
    });
  }

  openMobileSidebarPanel(): void {
    this.mobileMapPanelOpen.set(false);
  }

  async onMapClick(event: L.LeafletMouseEvent): Promise<void> {
    if (!this.canEditRoute() || this.isRouteInteractionLocked()) {
      return;
    }
    await this.addWaypoint(event.latlng.lat, event.latlng.lng);
  }

  selectWaypoint(index: number, source: 'map' | 'sidebar' = 'sidebar'): void {
    if (source === 'sidebar' && this.isRouteInteractionLocked()) {
      return;
    }
    const point = this.waypoints()[index];
    if (!point || !this.map) {
      return;
    }
    if (source === 'map' && this.compactRouteLayout()) {
      this.mobileMapPanelOpen.set(false);
    }
    this.selectedWaypointIndex.set(index);
    this.map.flyTo([point.lat, point.lng], Math.max(this.map.getZoom(), 8), {
      animate: true,
      duration: 0.35
    });
    if (source === 'map') {
      this.scrollPointCardIntoView(index);
    }
  }

  async onSearchChange(value: string): Promise<void> {
    if (!this.canEditRoute()) {
      this.searchResults.set([]);
      this.highlightedSearchIndex.set(-1);
      return;
    }
    const query = value.trim();
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
    if (query.length < 3) {
      this.searchResults.set([]);
      this.highlightedSearchIndex.set(-1);
      return;
    }
    this.isSearching.set(true);
    this.searchDebounceTimer = setTimeout(async () => {
      const items = await this.searchAddress(query);
      this.searchResults.set(items);
      this.highlightedSearchIndex.set(items.length > 0 ? 0 : -1);
      this.isSearching.set(false);
    }, 500);
  }

  async selectSearchResult(item: NominatimResult, input: HTMLInputElement): Promise<void> {
    if (!this.canEditRoute()) {
      return;
    }
    input.value = '';
    this.searchResults.set([]);
    this.highlightedSearchIndex.set(-1);
    await this.addWaypoint(Number(item.lat), Number(item.lon), item.display_name, item.address?.country_code ?? null);
  }

  async removeWaypoint(index: number): Promise<void> {
    if (!this.canEditRoute()) {
      return;
    }
    this.waypoints.update((items) => items.filter((_, currentIndex) => currentIndex !== index));
    this.selectedWaypointIndex.update((current) => {
      if (current === null) {
        return null;
      }
      if (current === index) {
        return null;
      }
      return current > index ? current - 1 : current;
    });
    await this.recalculateRoute();
  }

  async clearAllPoints(): Promise<void> {
    if (!this.canEditRoute()) {
      return;
    }
    this.waypoints.set([]);
    this.segmentDistances.set([]);
    this.searchResults.set([]);
    this.selectedWaypointIndex.set(null);
    this.selectedCountryBySegment.set({});
    this.borderCheckpointSelectValue.set({});
    if (this.routeLayer && this.map) {
      this.map.removeLayer(this.routeLayer);
      this.routeLayer = null;
    }
  }

  clearAllOperations(): void {
    if (!this.canEditRoute()) {
      return;
    }
    this.waypoints.update((items) =>
      items.map((item) => ({ ...item, operations: [] }))
    );
  }

  async saveCurrentRoute(): Promise<void> {
    if (!this.canEditRoute()) {
      return;
    }
    if (!this.hasRoute()) {
      this.showToast('pages.freightCalculation.errors.routeRequired');
      return;
    }
    if (this.hasPendingBorder()) {
      this.showToast('pages.freightCalculation.errors.selectBorderRequired');
      return;
    }
    const opsErrorKey = this.getOperationsErrorKey();
    if (opsErrorKey) {
      this.showToast(opsErrorKey);
      return;
    }
    this.isSavingRoute.set(true);
    try {
      const selectedRouteId = this.getSelectedRouteId();
      const snapshotPayload = this.createRouteSnapshotRequest();
      const snapshot = selectedRouteId && this.isEditMode()
        ? await this.routesApi.updateMyRoute(selectedRouteId, snapshotPayload)
        : await firstValueFrom(this.http.post<RouteSnapshotContractDto>(this.backendApi.routes, snapshotPayload));
      this.showToast('pages.freightCalculation.routeSaved');
      await this.loadMyRoutes();
      this.lastSavedAt.set(snapshot.updatedAt || snapshot.createdAt || null);
      this.routeTimestamps.set({
        createdAt: snapshot.createdAt ?? null,
        updatedAt: snapshot.updatedAt ?? snapshot.createdAt ?? null,
        lastOpenedAt: this.routeTimestamps().lastOpenedAt
      });
      this.mode.set('view');
      await this.router.navigate([], {
        relativeTo: this.activatedRoute,
        queryParams: { routeId: snapshot.id, mode: 'view' },
        queryParamsHandling: 'merge'
      });
    } catch (error) {
      const lockedCode = this.extractApiErrorCode(error);
      if (lockedCode === 'ROUTE_LOCKED_BY_REQUEST') {
        this.showToast('pages.freightCalculation.errors.routeLockedByRequest');
        return;
      }
      const routeOpsError = this.extractRouteOperationsErrorFromApi(error);
      if (routeOpsError) {
        this.showToast(routeOpsError.key, routeOpsError.params);
      } else {
        this.showToast(this.extractApiErrorMessage(error) ?? 'pages.freightCalculation.errors.routeSaveFailed');
      }
    } finally {
      this.isSavingRoute.set(false);
    }
  }

  async duplicateLockedRoute(): Promise<void> {
    const routeId = this.getSelectedRouteId();
    if (!routeId || !this.hasRoute()) {
      return;
    }
    this.isDuplicatingRoute.set(true);
    try {
      const snapshot = await this.routesApi.duplicateMyRoute(routeId);
      this.showToast('pages.routeBuilder.duplicateRouteSuccess');
      await this.router.navigate(['/route-builder'], {
        queryParams: { routeId: snapshot.id, mode: 'edit' }
      });
    } catch {
      this.showToast('pages.routeBuilder.duplicateRouteFailed');
    } finally {
      this.isDuplicatingRoute.set(false);
    }
  }

  /** Перехід на список збережених маршрутів (`/routes`). */
  async goToRoutesList(): Promise<void> {
    await this.router.navigate(['/routes']);
  }

  onBorderCountryMatSelect(segmentIndex: number, value: unknown): void {
    const country = typeof value === 'string' && value.length > 0 ? value : null;
    this.selectedCountryBySegment.update((prev) => ({ ...prev, [segmentIndex]: country }));
    this.borderCheckpointSelectValue.update((m) => ({ ...m, [segmentIndex]: '' }));
  }

  getBorderCheckpointSelectValue(segmentIndex: number): string {
    return this.borderCheckpointSelectValue()[segmentIndex] ?? '';
  }

  async onBorderCheckpointMatSelect(segmentIndex: number, value: unknown): Promise<void> {
    const str = value === null || value === undefined ? '' : String(value);
    if (str === '') {
      return;
    }
    const idx = Number(str);
    if (!Number.isInteger(idx) || idx < 0) {
      return;
    }
    await this.addBorderCheckpoint(segmentIndex, idx);
    this.borderCheckpointSelectValue.update((m) => ({ ...m, [segmentIndex]: '' }));
  }

  async addBorderCheckpoint(segmentIndex: number, checkpointIndex: number): Promise<void> {
    if (!this.canEditRoute()) {
      return;
    }
    const country = this.selectedCountryBySegment()[segmentIndex];
    if (!country) {
      return;
    }
    const checkpoint = CHECKPOINTS_DATA[country]?.[checkpointIndex];
    if (!checkpoint) {
      return;
    }
    const name = checkpoint.name[this.lang()] ?? checkpoint.name.en;
    const geocoded = await this.reverseGeocode(checkpoint.lat, checkpoint.lng);
    const next = [...this.waypoints()];
    next.splice(segmentIndex + 1, 0, {
      lat: checkpoint.lat,
      lng: checkpoint.lng,
      address: name,
      // Для border-точки визначаємо country так само, як і для звичайної точки: через reverse geocode.
      country: geocoded.country ?? country.toLowerCase(),
      isBorder: true,
      operations: []
    });
    this.waypoints.set(next);
    this.selectedWaypointIndex.set(segmentIndex + 1);
    await this.recalculateRoute();
  }

  async openFreightRequestDialog(): Promise<void> {
    if (!this.isViewMode()) {
      this.showToast('pages.freightCalculation.errors.requestOnlyInViewMode');
      return;
    }
    if (!this.hasRoute()) {
      this.showToast('pages.freightCalculation.errors.routeRequired');
      return;
    }
    if (this.hasPendingBorder()) {
      this.showToast('pages.freightCalculation.errors.selectBorderRequired');
      return;
    }
    const opsErrorKey = this.getOperationsErrorKey();
    if (opsErrorKey) {
      this.showToast(opsErrorKey);
      return;
    }
    const routeId = this.getSelectedRouteId();
    if (!routeId) {
      this.showToast('pages.freightCalculation.errors.routeMustBeSaved');
      return;
    }
    const dialogRef = this.dialog.open(
      RouteFreightRequestDialogComponent,
      getRouteFreightRequestDialogConfig({
        routeId,
        createdAt: this.routeTimestamps().createdAt,
        updatedAt: this.routeTimestamps().updatedAt,
        pointsCount: this.waypoints().length,
        distanceKm: Number((this.totalDistanceMeters() / 1000).toFixed(3))
      })
    );
    const submitted = await firstValueFrom(dialogRef.afterClosed());
    if (submitted) {
      this.showToast('pages.freightCalculation.success');
    }
  }

  getSegmentCountryOptions(): string[] {
    return Object.keys(CHECKPOINTS_DATA);
  }

  getCheckpoints(country: string): Checkpoint[] {
    return CHECKPOINTS_DATA[country] ?? [];
  }

  getCheckpointLocalizedName(checkpoint: Checkpoint): string {
    return checkpoint.name[this.lang()] ?? checkpoint.name.en;
  }

  getPointLabel(index: number): string {
    const points = this.waypoints();
    if (index === 0) {
      return 'pages.freightCalculation.labels.start';
    }
    if (index === points.length - 1) {
      return 'pages.freightCalculation.labels.finish';
    }
    return points[index].isBorder
      ? 'pages.freightCalculation.labels.border'
      : 'pages.freightCalculation.labels.stop';
  }

  formatPointCoordinates(point: Waypoint): string {
    return `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`;
  }

  async copyPointCoordinates(point: Waypoint): Promise<void> {
    const value = this.formatPointCoordinates(point);
    const isClipboardAvailable =
      typeof navigator !== 'undefined' &&
      'clipboard' in navigator &&
      typeof navigator.clipboard?.writeText === 'function';

    if (isClipboardAvailable) {
      try {
        await navigator.clipboard.writeText(value);
        this.showToast('pages.routeBuilder.coordinatesCopied');
        return;
      } catch {
        // Fall back to legacy clipboard API below.
      }
    }

    const copied = this.copyTextWithFallback(value);
    this.showToast(copied ? 'pages.routeBuilder.coordinatesCopied' : 'pages.routeBuilder.coordinatesCopyFailed');
  }

  getModeTitleKey(): string {
    if (this.isViewMode()) {
      return 'pages.routeBuilder.modeTitleView';
    }
    if (this.isEditMode()) {
      return 'pages.routeBuilder.modeTitleEdit';
    }
    return 'pages.routeBuilder.modeTitleCreate';
  }

  getLastSavedAtLabel(): string | null {
    return this.formatRouteDateTime(this.routeTimestamps().updatedAt);
  }

  getRouteCreatedAtLabel(): string | null {
    return this.formatRouteDateTime(this.routeTimestamps().createdAt);
  }

  getRouteUpdatedAtLabel(): string | null {
    return this.formatRouteDateTime(this.routeTimestamps().updatedAt);
  }

  getRouteLastOpenedAtLabel(): string | null {
    return this.formatRouteDateTime(this.routeTimestamps().lastOpenedAt);
  }

  getRouteIdLabel(): string | null {
    if (this.isCreateMode()) {
      return null;
    }
    return this.getSelectedRouteId();
  }

  private formatRouteDateTime(isoDateTime: string | null): string | null {
    if (!isoDateTime) {
      return null;
    }
    const parsedDate = new Date(isoDateTime);
    if (Number.isNaN(parsedDate.getTime())) {
      return null;
    }
    const locale =
      this.lang() === 'uk' ? 'uk-UA' : this.lang() === 'ru' ? 'ru-RU' : 'en-GB';
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(parsedDate);
  }

  async onSearchKeydown(event: KeyboardEvent, input: HTMLInputElement): Promise<void> {
    if (!this.canEditRoute()) {
      return;
    }
    const items = this.searchResults();
    if (!items.length) {
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.highlightedSearchIndex.update((current) => (current + 1) % items.length);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.highlightedSearchIndex.update((current) => (current - 1 + items.length) % items.length);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const selectedIndex = this.highlightedSearchIndex();
      const selected = items[selectedIndex] ?? items[0];
      await this.selectSearchResult(selected, input);
      return;
    }
    if (event.key === 'Escape') {
      this.searchResults.set([]);
      this.highlightedSearchIndex.set(-1);
    }
  }

  getPointOperations(index: number): RoutePointOperation[] {
    return this.waypoints()[index]?.operations ?? [];
  }

  getAllowedOperations(index: number): RoutePointOperation[] {
    return this.getAllowedOperationsByContext(this.waypoints(), index);
  }

  isOperationsErrorOnPoint(index: number): boolean {
    const error = this.operationsValidationError();
    if (!error) {
      return false;
    }
    if (
      error.code === 'LOADING_REQUIRED' ||
      error.code === 'UNLOADING_REQUIRED' ||
      error.code === 'UNLOADING_REQUIRED_AFTER_LAST_LOADING' ||
      error.code === 'MISSING_EXPORT_BEFORE_BORDER' ||
      error.code === 'MISSING_IMPORT_AFTER_BORDER'
    ) {
      return false;
    }
    return error.pointIndex === index;
  }

  getOperationsErrorKey(): string | null {
    const error = this.operationsValidationError();
    if (!error) {
      return null;
    }
    return `pages.routeBuilder.errors.${this.errorCodeToKey(error.code)}`;
  }

  getSidebarOperationsErrorKey(): string | null {
    const error = this.operationsValidationError();
    if (!error) {
      return null;
    }
    if (
      error.code !== 'LOADING_REQUIRED' &&
      error.code !== 'UNLOADING_REQUIRED' &&
      error.code !== 'UNLOADING_REQUIRED_AFTER_LAST_LOADING' &&
      error.code !== 'MISSING_EXPORT_BEFORE_BORDER' &&
      error.code !== 'MISSING_IMPORT_AFTER_BORDER'
    ) {
      return null;
    }
    return `pages.routeBuilder.errors.${this.errorCodeToKey(error.code)}`;
  }

  getSidebarTopErrorKey(): string | null {
    if (this.waypoints().length === 1) {
      return 'pages.freightCalculation.errors.addAtLeastOneMorePoint';
    }
    if (this.hasPendingBorder()) {
      return 'pages.freightCalculation.errors.selectBorderRequired';
    }
    return this.getSidebarOperationsErrorKey();
  }

  onPointOperationsChange(index: number, value: unknown): void {
    if (!this.canEditRoute()) {
      return;
    }
    const next = Array.isArray(value)
      ? this.normalizeOperationsValue(value)
      : [];
    const point = this.waypoints()[index];
    if (!point) {
      return;
    }
    const problem = checkSetOperationsForPoint(point.isBorder, next);
    if (problem) {
      this.showToast('pages.routeBuilder.errors.operationsComboWithPoint', { point: index + 1 });
      // Не зберігаємо некоректний набір — змусимо UI відобразити поточне (валідне) значення.
      this.waypoints.update((items) =>
        items.map((item, idx) => (idx === index ? { ...item, operations: [...item.operations] } : item))
      );
      return;
    }
    this.waypoints.update((items) =>
      items.map((item, idx) => (idx === index ? { ...item, operations: next } : item))
    );
  }

  private normalizeOperationsValue(value: unknown[]): RoutePointOperation[] {
    // Нормалізуємо вхідні значення до відомого переліку операцій та прибираємо дублікати.
    const allowedSet = new Set<RoutePointOperation>(ROUTE_POINT_OPERATIONS);
    const unique = new Set<RoutePointOperation>();
    for (const raw of value) {
      if (typeof raw !== 'string') {
        continue;
      }
      const normalized = raw.trim() as RoutePointOperation;
      if (!allowedSet.has(normalized)) {
        continue;
      }
      unique.add(normalized);
    }
    return ROUTE_POINT_OPERATIONS.filter((op) => unique.has(op));
  }

  isPointOperationChecked(index: number, operation: RoutePointOperation): boolean {
    return this.getPointOperations(index).includes(operation);
  }

  isPointCardInteractive(): boolean {
    return !this.isRouteInteractionLocked();
  }

  onPointOperationToggle(index: number, operation: RoutePointOperation, checked: boolean): void {
    const current = this.getPointOperations(index);
    const next = checked
      ? Array.from(new Set([...current, operation]))
      : current.filter((item) => item !== operation);
    this.onPointOperationsChange(index, next);
  }

  private errorCodeToKey(code: RoutePointOperationsError['code']): string {
    switch (code) {
      case 'OPERATION_SET_INVALID':
        return 'operationsCombo';
      case 'BORDER_TOO_MANY':
        return 'borderTooMany';
      case 'CUSTOMS_WITHOUT_BORDER':
        return 'customsWithoutBorder';
      case 'LOADING_REQUIRED':
        return 'loadingRequired';
      case 'UNLOADING_REQUIRED':
        return 'unloadingRequired';
      case 'UNLOADING_BEFORE_LOADING':
        return 'unloadingBeforeLoading';
      case 'UNLOADING_REQUIRED_AFTER_LAST_LOADING':
        return 'unloadingRequiredAfterLastLoading';
      case 'EXPORT_TOO_MANY':
        return 'exportTooMany';
      case 'IMPORT_TOO_MANY':
        return 'importTooMany';
      case 'MISSING_EXPORT_BEFORE_BORDER':
        return 'missingExportBeforeBorder';
      case 'MISSING_IMPORT_AFTER_BORDER':
        return 'missingImportAfterBorder';
      case 'IMPORT_BEFORE_EXPORT':
        return 'importBeforeExport';
      case 'OPERATION_IN_TRANSIT':
        return 'operationInTransit';
      case 'UNCLOSED_CUSTOMS':
        return 'unclosedCustoms';
    }
  }

  private initializeMap(): void {
    const container = this.mapContainer.nativeElement;
    container.style.width = '100%';
    container.style.removeProperty('height');
    container.style.removeProperty('min-height');

    const map = L.map(this.mapContainer.nativeElement, { zoomControl: true }).setView([50.4501, 30.5234], 6);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; GeoSan'
    }).addTo(map);
    map.on('click', (event: L.LeafletMouseEvent) => void this.onMapClick(event));
    this.map = map;
    this.rebuildMarkers();
    this.scheduleMapResizeFix();
    requestAnimationFrame(() => {
      this.map?.invalidateSize();
    });
  }

  private initializeMapWhenContainerReady(attempt = 0): void {
    const container = this.mapContainer.nativeElement;
    const hasSize = container.clientWidth > 0 && container.clientHeight > 0;
    if (hasSize) {
      this.initializeMap();
      return;
    }
    if (attempt >= 30) {
      this.initializeMap();
      return;
    }
    const timer = setTimeout(() => {
      this.initializeMapWhenContainerReady(attempt + 1);
    }, 50);
    this.resizeTimers.push(timer);
  }

  private scheduleMapResizeFix(): void {
    this.resizeTimers.forEach((timer) => clearTimeout(timer));
    const delays = [0, 100, 300, 700];
    this.resizeTimers = delays.map((delay) =>
      setTimeout(() => {
        this.map?.invalidateSize();
      }, delay)
    );
  }

  private scrollPointCardIntoView(index: number): void {
    requestAnimationFrame(() => {
      const container = this.pointsListContainer?.nativeElement;
      const row = this.pointRows?.get(index)?.nativeElement;
      if (!container || !row) {
        return;
      }
      const containerRect = container.getBoundingClientRect();
      const rowRect = row.getBoundingClientRect();
      const padding = 12;
      if (rowRect.top < containerRect.top) {
        container.scrollTop += rowRect.top - containerRect.top - padding;
      } else if (rowRect.bottom > containerRect.bottom) {
        container.scrollTop += rowRect.bottom - containerRect.bottom + padding;
      }
    });
  }

  private scrollFirstBorderPickerIntoView(): void {
    const scrollToPicker = () => {
      const picker = this.borderPickers?.first?.nativeElement;
      if (!picker) {
        return;
      }
      picker.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    };
    requestAnimationFrame(() => {
      scrollToPicker();
      setTimeout(scrollToPicker, 50);
    });
  }

  private async addWaypoint(lat: number, lng: number, address?: string, country?: string | null): Promise<void> {
    const fallbackAddress = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    const waypointIndex = this.waypoints().length;
    const hasProvidedAddress = Boolean(address);

    this.waypoints.update((items) => {
      const next = [
        ...items,
        {
          lat,
          lng,
          address: address ?? fallbackAddress,
          country: country?.toLowerCase() ?? null,
          isBorder: false,
          operations: [] as RoutePointOperation[]
        }
      ];
      this.selectedWaypointIndex.set(next.length - 1);
      return next;
    });

    await this.recalculateRoute();

    if (hasProvidedAddress) {
      return;
    }

    const geocoded = await this.reverseGeocode(lat, lng);
    this.waypoints.update((items) =>
      items.map((item, index) =>
        index === waypointIndex
          ? { ...item, address: geocoded.address, country: geocoded.country }
          : item
      )
    );
  }

  private async recalculateRoute(): Promise<void> {
    const points = this.waypoints();
    if (points.length < 2) {
      this.segmentDistances.set([]);
      if (this.routeLayer && this.map) {
        this.map.removeLayer(this.routeLayer);
        this.routeLayer = null;
      }
      return;
    }
    const route = await this.fetchRoute(points);
    if (!route || !this.map) {
      this.segmentDistances.set([]);
      return;
    }
    this.segmentDistances.set(route.legs.map((leg) => leg.distance));
    if (this.routeLayer) {
      this.map.removeLayer(this.routeLayer);
    }
    const latLngs = route.geometry.coordinates.map(([lng, lat]) => L.latLng(lat, lng));
    this.routeLayer = L.polyline(latLngs, { color: '#2563eb', weight: 5, opacity: 0.7 }).addTo(this.map);
    this.map.fitBounds(this.routeLayer.getBounds(), { padding: [40, 40] });
  }

  private rebuildMarkers(points: Waypoint[] = this.waypoints(), selectedIndex: number | null = this.selectedWaypointIndex()): void {
    if (!this.map) {
      return;
    }
    this.markers.forEach((marker) => marker.remove());
    this.markers = points.map((point, index) => {
      const marker = L.marker([point.lat, point.lng], {
        draggable: this.canEditRoute() && !this.isRouteInteractionLocked(),
        icon: this.createWaypointIcon(point, index, index === selectedIndex),
        zIndexOffset: 1000
      }).addTo(this.map!);
      marker.on('click', () => {
        this.selectWaypoint(index, 'map');
      });
      marker.on('dragend', async () => {
        if (!this.canEditRoute() || this.isRouteInteractionLocked()) {
          return;
        }
        const position = marker.getLatLng();
        const geocoded = await this.reverseGeocode(position.lat, position.lng);
        this.selectWaypoint(index, 'map');
        this.waypoints.update((items) =>
          items.map((item, itemIndex) =>
            itemIndex === index
              ? { ...item, lat: position.lat, lng: position.lng, address: geocoded.address, country: geocoded.country }
              : item
          )
        );
        await this.recalculateRoute();
      });
      return marker;
    });
  }

  private createWaypointIcon(point: Waypoint, index: number, isSelected: boolean): L.DivIcon {
    const label = String(index + 1);
    const backgroundColor = point.isBorder ? '#16a34a' : '#2563eb';
    const borderStyle = isSelected
      ? point.isBorder
        ? 'border: 3px solid #ffffff; box-shadow: 0 0 0 2px rgba(22, 163, 74, 0.35);'
        : 'border: 3px solid #ffffff; box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.35);'
      : 'border: none;';
    return L.divIcon({
      html: `<div style="margin:0;padding:0;border:0;background:transparent;box-shadow:none;"><div style="width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#ffffff;font-size:10px;font-weight:700;box-sizing:border-box;background:${backgroundColor};${borderStyle}">${label}</div></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      className: 'waypoint-icon-shell'
    });
  }

  private async searchAddress(query: string): Promise<NominatimResult[]> {
    const lang = this.lang();
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&accept-language=${lang}&addressdetails=1`);
    if (!response.ok) {
      return [];
    }
    return (await response.json()) as NominatimResult[];
  }

  private async reverseGeocode(lat: number, lng: number): Promise<{ address: string; country: string | null }> {
    const lang = this.lang();
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=${lang}&addressdetails=1`);
    if (!response.ok) {
      return { address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`, country: null };
    }
    const data = (await response.json()) as NominatimResult;
    return { address: data.display_name ?? `${lat.toFixed(4)}, ${lng.toFixed(4)}`, country: data.address?.country_code?.toLowerCase() ?? null };
  }

  private async fetchRoute(points: Waypoint[]): Promise<OsrmRoute | null> {
    const coords = points.map((point) => `${point.lng},${point.lat}`).join(';');
    const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false`);
    if (!response.ok) {
      return null;
    }
    const payload = (await response.json()) as OsrmResponse;
    return payload.routes[0] ?? null;
  }

  private getSelectedRouteId(): string | null {
    return this.activatedRoute.snapshot.queryParamMap.get('routeId');
  }

  private createRouteSnapshotRequest() {
    const points = this.createRoutePointsContract();
    const title = points.length >= 2 ? `${points[0].address} -> ${points[points.length - 1].address}` : 'Saved route';
    return {
      title,
      routingProfile: 'driving',
      routingMode: 'fast',
      routePolyline: this.serializeRoutePolyline(),
      distanceKm: Number((this.totalDistanceMeters() / 1000).toFixed(3)),
      durationMin: null,
      routeComment: this.requestForm.getRawValue().routeComment || null,
      points,
      hereRouteMeta: null
    };
  }

  private createRoutePointsContract(): RoutePointContract[] {
    // Перед відправкою на бекенд прибираємо приховані/застарілі операції за актуальним контекстом.
    const points = this.normalizeWaypointOperations(this.waypoints());
    const distances = this.segmentDistances();
    const lastIndex = points.length - 1;
    return points.map((point, index) => ({
      order: index + 1,
      type: index === 0 ? 'START' : index === lastIndex ? 'FINISH' : point.isBorder ? 'BORDER' : 'STOP',
      address: point.address,
      lat: Number(point.lat.toFixed(6)),
      lng: Number(point.lng.toFixed(6)),
      country: point.country ?? '',
      isBorder: point.isBorder,
      segmentDistanceKmToNext: index < lastIndex && distances[index] !== undefined ? Number((distances[index] / 1000).toFixed(3)) : null,
      operations: [...(point.operations ?? [])]
    }));
  }

  private serializeRoutePolyline(): string {
    if (!this.routeLayer) {
      return this.waypoints()
        .map((p) => `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`)
        .join(';');
    }
    const coords = this.routeLayer.getLatLngs() as L.LatLng[];
    return JSON.stringify(coords.map((c) => [Number(c.lat.toFixed(6)), Number(c.lng.toFixed(6))]));
  }

  private async loadRouteFromQuery(params: ParamMap): Promise<void> {
    const routeId = params.get('routeId');
    const modeFromQuery = this.parseMode(params.get('mode'));
    this.mode.set(modeFromQuery ?? (routeId ? 'view' : 'create'));
    if (!routeId) {
      this.editBaselineSignature.set(null);
      this.lastSavedAt.set(null);
      this.routeTimestamps.set({ createdAt: null, updatedAt: null, lastOpenedAt: null });
      this.routeLockedByRequest.set(false);
      this.requestForm.patchValue({ routeComment: '' });
      await this.clearAllPoints();
      this.rebuildMarkers();
      return;
    }
    this.isLoadingSavedRoute.set(true);
    try {
      const snapshot = await this.routesApi.getMyRouteById(routeId);
      await this.applySavedRoute(snapshot);
      if (this.isEditMode()) {
        this.captureEditBaseline();
      } else {
        this.editBaselineSignature.set(null);
      }
      await this.syncRouteTimestampsFromSummary(routeId);
      this.showToast('pages.freightCalculation.routeLoaded');
    } catch {
      this.showToast('pages.freightCalculation.errors.routeLoadFailed');
    } finally {
      this.isLoadingSavedRoute.set(false);
    }
  }

  private async applySavedRoute(snapshot: RouteSnapshotContractDto): Promise<void> {
    const points: Waypoint[] = [...snapshot.points]
      .sort((a, b) => a.order - b.order)
      .map((point) => ({
        lat: point.lat,
        lng: point.lng,
        address: point.address,
        country: point.country ? point.country.toLowerCase() : null,
        isBorder: point.isBorder,
        operations: [...((point.operations ?? []) as RoutePointOperation[])]
      }));
    this.waypoints.set(points);
    this.segmentDistances.set(
      snapshot.points
        .sort((a, b) => a.order - b.order)
        .map((point) => point.segmentDistanceKmToNext)
        .filter((distance): distance is number => distance !== null)
        .map((distance) => distance * 1000)
    );
    this.selectedWaypointIndex.set(points.length ? 0 : null);
    this.requestForm.patchValue({ routeComment: snapshot.routeComment ?? '' });
    this.lastSavedAt.set(snapshot.updatedAt || snapshot.createdAt || null);
    this.routeTimestamps.set({
      createdAt: snapshot.createdAt ?? null,
      updatedAt: snapshot.updatedAt ?? snapshot.createdAt ?? null,
      lastOpenedAt: null
    });
    this.routeLockedByRequest.set(snapshot.lockedByRequest === true);
    await this.drawSavedPolyline(snapshot.routePolyline, points);
  }

  private async drawSavedPolyline(routePolyline: string, points: Waypoint[]): Promise<void> {
    if (!this.map) {
      return;
    }
    if (this.routeLayer) {
      this.map.removeLayer(this.routeLayer);
      this.routeLayer = null;
    }
    const latLngs = this.parseSavedPolyline(routePolyline);
    const fallback = points.map((point) => L.latLng(point.lat, point.lng));
    const path = latLngs.length ? latLngs : fallback;
    if (!path.length) {
      return;
    }
    this.routeLayer = L.polyline(path, { color: '#2563eb', weight: 5, opacity: 0.7 }).addTo(this.map);
    this.map.fitBounds(this.routeLayer.getBounds(), { padding: [40, 40] });
  }

  private parseSavedPolyline(routePolyline: string): L.LatLng[] {
    try {
      const parsed = JSON.parse(routePolyline) as [number, number][];
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed
        .filter((item) => Array.isArray(item) && item.length === 2)
        .map((item) => L.latLng(item[0], item[1]));
    } catch {
      return [];
    }
  }

  private async loadMyRoutes(): Promise<void> {
    try {
      const routes = await this.routesApi.getMyRoutes();
      this.myRoutes.set(routes);
    } catch {
      this.myRoutes.set([]);
    }
  }

  private async syncRouteTimestampsFromSummary(routeId: string): Promise<void> {
    await this.loadMyRoutes();
    const summary = this.myRoutes().find((route) => route.id === routeId);
    if (!summary) {
      return;
    }
    this.routeTimestamps.set({
      createdAt: this.routeTimestamps().createdAt,
      updatedAt: this.routeTimestamps().updatedAt,
      lastOpenedAt: summary.lastOpenedAt ?? null
    });
  }

  private showToast(key: string, params: Record<string, unknown> = {}): void {
    this.toastMessage.set(key);
    this.toastMessageParams.set(params);
    setTimeout(() => {
      this.toastMessage.set('');
      this.toastMessageParams.set({});
    }, 5000);
  }

  private extractApiErrorCode(error: unknown): string | null {
    if (!(error instanceof HttpErrorResponse)) {
      return null;
    }
    const payload = error.error;
    if (!payload || typeof payload !== 'object') {
      return null;
    }
    const code = payload['code'];
    return typeof code === 'string' ? code : null;
  }

  private extractApiErrorMessage(error: unknown): string | null {
    if (!(error instanceof HttpErrorResponse)) {
      return null;
    }
    const payload = error.error;
    if (typeof payload === 'string' && payload.trim().length > 0) {
      return payload.trim();
    }
    if (!payload || typeof payload !== 'object') {
      return null;
    }
    const candidateKeys = ['message', 'error', 'detail', 'title'] as const;
    for (const key of candidateKeys) {
      const value = payload[key];
      if (typeof value === 'string' && value.trim().length > 0) {
        return value.trim();
      }
    }
    return null;
  }

  private extractRouteOperationsErrorFromApi(error: unknown): {
    key: string;
    params: Record<string, unknown>;
  } | null {
    if (!(error instanceof HttpErrorResponse)) {
      return null;
    }
    const payload = error.error;
    if (!payload || typeof payload !== 'object') {
      return null;
    }
    const code = payload['code'];
    if (typeof code !== 'string' || !code.startsWith('ROUTE_OPERATIONS_')) {
      return null;
    }
    const backendCode = code.replace('ROUTE_OPERATIONS_', '');
    const key = this.mapBackendOperationsErrorCodeToTranslationKey(backendCode);
    if (!key) {
      return null;
    }
    const message = payload['message'];
    if (key === 'operationsCombo' && typeof message === 'string') {
      const match = message.match(/index\s+(\d+)/i);
      if (match) {
        return {
          key: 'pages.routeBuilder.errors.operationsComboWithPoint',
          params: { point: Number(match[1]) + 1 }
        };
      }
    }
    return { key: `pages.routeBuilder.errors.${key}`, params: {} };
  }

  private mapBackendOperationsErrorCodeToTranslationKey(code: string): string | null {
    // Тримаймо мапінг кодів бекенда в одному місці, щоб уникнути розсинхрону з toast-повідомленнями.
    switch (code) {
      case 'OPERATION_SET_INVALID':
        return 'operationsCombo';
      case 'BORDER_TOO_MANY':
        return 'borderTooMany';
      case 'CUSTOMS_WITHOUT_BORDER':
        return 'customsWithoutBorder';
      case 'LOADING_REQUIRED':
        return 'loadingRequired';
      case 'UNLOADING_REQUIRED':
        return 'unloadingRequired';
      case 'UNLOADING_BEFORE_LOADING':
        return 'unloadingBeforeLoading';
      case 'UNLOADING_REQUIRED_AFTER_LAST_LOADING':
        return 'unloadingRequiredAfterLastLoading';
      case 'EXPORT_TOO_MANY':
        return 'exportTooMany';
      case 'IMPORT_TOO_MANY':
        return 'importTooMany';
      case 'MISSING_EXPORT_BEFORE_BORDER':
        return 'missingExportBeforeBorder';
      case 'MISSING_IMPORT_AFTER_BORDER':
        return 'missingImportAfterBorder';
      case 'IMPORT_BEFORE_EXPORT':
        return 'importBeforeExport';
      case 'OPERATION_IN_TRANSIT':
        return 'operationInTransit';
      case 'UNCLOSED_CUSTOMS':
        return 'unclosedCustoms';
      default:
        return null;
    }
  }

  private copyTextWithFallback(value: string): boolean {
    if (typeof document === 'undefined') {
      return false;
    }
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
    try {
      return document.execCommand('copy');
    } catch {
      return false;
    } finally {
      document.body.removeChild(textarea);
    }
  }

  async switchToEditMode(): Promise<void> {
    if (this.routeLockedByRequest()) {
      this.showToast('pages.routeBuilder.routeLockedByRequest');
      return;
    }
    if (!this.getSelectedRouteId()) {
      return;
    }
    this.mode.set('edit');
    this.captureEditBaseline();
    await this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: { mode: 'edit' },
      queryParamsHandling: 'merge'
    });
    this.rebuildMarkers();
  }

  async switchToCreateMode(): Promise<void> {
    this.mode.set('create');
    this.editBaselineSignature.set(null);
    this.lastSavedAt.set(null);
    this.routeTimestamps.set({ createdAt: null, updatedAt: null, lastOpenedAt: null });
    this.routeLockedByRequest.set(false);
    await this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: { routeId: null, mode: 'create' },
      queryParamsHandling: 'merge'
    });
    await this.clearAllPoints();
    this.rebuildMarkers();
  }

  async switchToViewMode(): Promise<void> {
    if (!this.getSelectedRouteId()) {
      return;
    }
    this.mode.set('view');
    this.editBaselineSignature.set(null);
    await this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: { mode: 'view' },
      queryParamsHandling: 'merge'
    });
    this.rebuildMarkers();
  }

  async deleteCurrentRoute(): Promise<void> {
    const routeId = this.getSelectedRouteId();
    if (!routeId || this.isSavingRoute()) {
      return;
    }
    this.isSavingRoute.set(true);
    try {
      await this.routesApi.deleteMyRoute(routeId);
      this.showToast('pages.routeBuilder.routeDeleted');
      await this.switchToCreateMode();
    } catch {
      this.showToast('pages.routesHistory.deleteFailed');
    } finally {
      this.isSavingRoute.set(false);
    }
  }

  async requestCurrentRouteDelete(): Promise<void> {
    const routeId = this.getSelectedRouteId();
    if (!routeId || this.isSavingRoute()) {
      return;
    }

    const points = this.waypoints();
    const routeTitle =
      points.length >= 2 ? `${points[0].address} -> ${points[points.length - 1].address}` : '';
    const dialogRef = this.dialog.open(RouteDeleteConfirmDialogComponent, {
      width: '420px',
      disableClose: true,
      data: {
        routeTitle,
        routeCreatedAt: this.getLastSavedAtLabel() ?? '-',
        routeDistanceKm: (this.totalDistanceMeters() / 1000).toFixed(1)
      }
    });

    const shouldDelete = await firstValueFrom(dialogRef.afterClosed());
    if (!shouldDelete) {
      return;
    }

    await this.deleteCurrentRoute();
  }

  private parseMode(value: string | null): RouteBuilderMode | null {
    return value === 'view' || value === 'edit' || value === 'create' ? value : null;
  }

  private normalizeWaypointOperations(points: Waypoint[]): Waypoint[] {
    return points.map((point, index) => {
      const allowed = this.getAllowedOperationsByContext(points, index);
      const nextOps = Array.from(new Set(point.operations.filter((op) => allowed.includes(op))));
      return { ...point, operations: nextOps };
    });
  }

  private captureEditBaseline(): void {
    this.editBaselineSignature.set(this.buildEditableRouteSignature());
  }

  private buildEditableRouteSignature(): string {
    const points = this.waypoints().map((point) => ({
      lat: Number(point.lat.toFixed(6)),
      lng: Number(point.lng.toFixed(6)),
      address: point.address,
      country: point.country ?? null,
      isBorder: point.isBorder,
      operations: [...point.operations]
    }));
    const routeComment = this.requestForm.getRawValue().routeComment.trim();
    return JSON.stringify({ points, routeComment });
  }

  private getAllowedOperationsByContext(points: Waypoint[], index: number): RoutePointOperation[] {
    const point = points[index];
    if (!point) {
      return [];
    }
    let allowed = getAllowedOperationsForPoint(point.isBorder);
    const hasBorderPoint = points.some((item) => item.isBorder);
    if (!hasBorderPoint) {
      allowed = allowed.filter((op) => op !== 'EXPORT_CUSTOMS' && op !== 'IMPORT_CUSTOMS');
    }
    const firstLoadingIndex = points.findIndex((item) => item.operations.includes('LOADING'));
    const borderIndex = points.findIndex((item) => item.isBorder);
    const canUseExportCustoms =
      firstLoadingIndex >= 0 &&
      borderIndex >= 0 &&
      index >= firstLoadingIndex &&
      index <= borderIndex;
    if (!canUseExportCustoms) {
      allowed = allowed.filter((op) => op !== 'EXPORT_CUSTOMS');
    }
    const hasExportBeforeCurrentPoint = points
      .slice(0, index + 1)
      .some((item) => item.operations.includes('EXPORT_CUSTOMS'));
    if (!hasExportBeforeCurrentPoint) {
      allowed = allowed.filter((op) => op !== 'IMPORT_CUSTOMS');
    }
    const hasSelectedExport = points.some((item) => item.operations.includes('EXPORT_CUSTOMS'));
    const canUseImportAfterBorder = borderIndex >= 0 && index > borderIndex;
    if (hasSelectedExport && !canUseImportAfterBorder) {
      allowed = allowed.filter((op) => op !== 'IMPORT_CUSTOMS');
    }
    const selectedExportIndex = points.findIndex((item) => item.operations.includes('EXPORT_CUSTOMS'));
    if (selectedExportIndex >= 0 && index !== selectedExportIndex) {
      allowed = allowed.filter((op) => op !== 'EXPORT_CUSTOMS');
    }
    const selectedImportIndex = points.findIndex((item) => item.operations.includes('IMPORT_CUSTOMS'));
    if (selectedImportIndex >= 0 && index !== selectedImportIndex) {
      allowed = allowed.filter((op) => op !== 'IMPORT_CUSTOMS');
    }
    if (selectedImportIndex >= 0 && index >= selectedImportIndex) {
      // Після точки розмитнення лишаємо тільки розвантаження;
      // на самій точці додатково лишаємо саму операцію IMPORT_CUSTOMS.
      allowed = allowed.filter(
        (op) => op === 'UNLOADING' || (index === selectedImportIndex && op === 'IMPORT_CUSTOMS')
      );
    }
    if (selectedExportIndex >= 0) {
      const isInCustomsTransit =
        index > selectedExportIndex && (selectedImportIndex < 0 || index < selectedImportIndex);
      if (isInCustomsTransit) {
        allowed = allowed.filter((op) => op !== 'LOADING' && op !== 'UNLOADING');
      }
    }
    const isFirstPoint = index === 0;
    const isLastPoint = index === points.length - 1;
    if (isFirstPoint) {
      allowed = allowed.filter((op) => op !== 'UNLOADING');
    }
    if (isLastPoint) {
      allowed = allowed.filter((op) => op !== 'LOADING');
    }
    return allowed;
  }
}

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    country_code?: string;
  };
}

interface OsrmResponse {
  routes: OsrmRoute[];
}

interface OsrmRoute {
  legs: { distance: number }[];
  geometry: { coordinates: [number, number][] };
}

type RouteBuilderMode = 'view' | 'edit' | 'create';
