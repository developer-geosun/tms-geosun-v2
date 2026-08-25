import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  LOCALE_ID,
  signal
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatBottomSheet, MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { RoutesApiService } from '../../core/api/routes-api.service';
import { RoutePointContract, RouteSummaryContractDto } from '../../core/api/routes-contracts.model';
import { RouteDeleteConfirmDialogComponent, getRouteFreightRequestDialogConfig, RouteFreightRequestDialogComponent } from '../../shared/components';
import { RoutesToolbarBottomSheetComponent } from './routes-toolbar-bottom-sheet.component';
import {
  RoutesToolbarListView,
  RoutesToolbarSheetData,
  RoutesToolbarSortDirection,
  RoutesToolbarSortKey
} from './routes-toolbar-sheet.model';

@Component({
  selector: 'app-routes',
  standalone: true,
  imports: [
    TranslateModule,
    MatCardModule,
    MatListModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatBottomSheetModule,
    MatTooltipModule
  ],
  templateUrl: './routes.component.html',
  styleUrl: './routes.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RoutesComponent {
  private readonly routesApi = inject(RoutesApiService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly bottomSheet = inject(MatBottomSheet);
  private readonly dateTimeFormatter = new Intl.DateTimeFormat(inject(LOCALE_ID), {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  /** Повний кеш карток (GET view=all + деталі); перемикач списку лише фільтрує локально. */
  private readonly allRouteCards = signal<RouteCardViewModel[]>([]);
  readonly routeCards = computed(() => {
    const filtered = this.filterRouteCardsByListView(this.allRouteCards(), this.listView());
    return this.sortRouteCards(filtered, this.sortBy(), this.sortDirection());
  });
  readonly listView = signal<RoutesToolbarListView>('active');
  /** Заголовок сторінки залежно від фільтра «Показати». */
  readonly listViewPageHeadingKey = computed(() => {
    switch (this.listView()) {
      case 'all':
        return 'pages.routes.listViewHeadingAll';
      case 'active':
        return 'pages.routes.listViewHeadingActive';
      case 'deleted':
        return 'pages.routes.listViewHeadingDeleted';
    }
  });
  /** Локальне сортування відфільтрованого списку (без запитів до API). */
  readonly sortBy = signal<RoutesToolbarSortKey>('updatedAt');
  /** Напрямок сортування для обраного критерію. */
  readonly sortDirection = signal<RoutesToolbarSortDirection>('desc');
  /** Блокування керування фільтром/сортуванням у bottom sheet. */
  readonly toolbarControlsBusy = computed(
    () => this.isLoading() || this.deletingRouteId() !== null || this.restoringRouteId() !== null
  );
  readonly isLoading = signal(true);
  readonly loadFailed = signal(false);
  readonly deletingRouteId = signal<string | null>(null);
  readonly restoringRouteId = signal<string | null>(null);
  readonly deleteFailed = signal(false);
  readonly toastMessage = signal('');

  constructor() {
    void this.loadRouteCards();
  }

  formatRouteDateTime(isoDateTime: string | null | undefined): string {
    if (!isoDateTime) {
      return '';
    }

    const parsedDate = new Date(isoDateTime);
    if (Number.isNaN(parsedDate.getTime())) {
      return isoDateTime;
    }

    return this.dateTimeFormatter.format(parsedDate);
  }

  async openRoute(routeId: string): Promise<void> {
    await this.router.navigate(['/route-builder'], { queryParams: { routeId, mode: 'view' } });
  }

  async editRoute(routeId: string): Promise<void> {
    await this.router.navigate(['/route-builder'], { queryParams: { routeId, mode: 'edit' } });
  }

  /** Перехід у конструктор для створення нового маршруту. */
  async createNewRoute(): Promise<void> {
    await this.router.navigate(['/route-builder'], { queryParams: { mode: 'create' } });
  }

  /** Відкрити bottom sheet з картками «Показати» та «Сортування». */
  protected onRoutesSettingsClick(): void {
    const data: RoutesToolbarSheetData = {
      listView: this.listView,
      sortBy: this.sortBy,
      sortDirection: this.sortDirection,
      isBusy: this.toolbarControlsBusy
    };
    this.bottomSheet.open(RoutesToolbarBottomSheetComponent, {
      data,
      panelClass: 'routes-toolbar-bottom-sheet-panel'
    });
  }

  async openFreightRequestDialog(route: RouteCardViewModel): Promise<void> {
    if (this.deletingRouteId() || route.deleted) {
      return;
    }
    const dialogRef = this.dialog.open(
      RouteFreightRequestDialogComponent,
      getRouteFreightRequestDialogConfig({
        routeId: route.id,
        createdAt: route.createdAt,
        updatedAt: route.updatedAt,
        pointsCount: route.points.length,
        distanceKm: route.distanceKm
      })
    );
    const submitted = await firstValueFrom(dialogRef.afterClosed());
    if (submitted) {
      this.showToast('pages.freightCalculation.success');
    }
  }

  async requestRouteDelete(
    routeId: string,
    routeTitle: string,
    routeCreatedAt: string | null | undefined,
    routeDistanceKm: number | null | undefined
  ): Promise<void> {
    if (this.deletingRouteId() || this.restoringRouteId()) {
      return;
    }

    const dialogRef = this.dialog.open(RouteDeleteConfirmDialogComponent, {
      width: '420px',
      disableClose: true,
      data: {
        routeTitle,
        routeCreatedAt: this.formatRouteDateTime(routeCreatedAt),
        routeDistanceKm: routeDistanceKm?.toFixed(1) ?? '0.0'
      }
    });

    const shouldDelete = await firstValueFrom(dialogRef.afterClosed());
    if (!shouldDelete) {
      return;
    }

    await this.deleteRoute(routeId);
  }

  async restoreRoute(routeId: string): Promise<void> {
    if (this.restoringRouteId() || this.deletingRouteId()) {
      return;
    }
    this.restoringRouteId.set(routeId);
    try {
      await this.routesApi.restoreMyRoute(routeId);
      this.showToast('pages.routes.restoreSuccess');
      await this.loadRouteCards();
    } catch {
      this.showToast('pages.routes.restoreFailed');
    } finally {
      this.restoringRouteId.set(null);
    }
  }

  formatPointCoordinates(point: RoutePointContract): string {
    return `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`;
  }

  async copyPointCoordinates(point: RoutePointContract): Promise<void> {
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

  private async loadRouteCards(): Promise<void> {
    this.isLoading.set(true);
    this.loadFailed.set(false);

    try {
      const summaries = await this.routesApi.getMyRoutes('all');
      const cards = await Promise.all(
        summaries.map(async (summary) => {
          try {
            const routeDetails = await this.routesApi.getMyRouteById(summary.id);
            return this.mapToCard(summary, routeDetails.points);
          } catch {
            return this.mapToCard(summary, []);
          }
        })
      );
      this.allRouteCards.set(cards);
    } catch {
      this.allRouteCards.set([]);
      this.loadFailed.set(true);
    } finally {
      this.isLoading.set(false);
    }
  }

  private filterRouteCardsByListView(
    cards: RouteCardViewModel[],
    view: RoutesToolbarListView
  ): RouteCardViewModel[] {
    switch (view) {
      case 'active':
        return cards.filter((card) => !card.deleted);
      case 'deleted':
        return cards.filter((card) => card.deleted);
      default:
        return cards;
    }
  }

  /** Сортування копії масиву за критерієм і напрямком (null км завжди в кінці). */
  private sortRouteCards(
    cards: RouteCardViewModel[],
    key: RoutesToolbarSortKey,
    direction: RoutesToolbarSortDirection
  ): RouteCardViewModel[] {
    const next = [...cards];
    next.sort((a, b) => {
      switch (key) {
        case 'id': {
          const d = this.parseRouteIdForSort(a.id) - this.parseRouteIdForSort(b.id);
          return direction === 'asc' ? d : -d;
        }
        case 'createdAt': {
          const d = this.compareTimeAsc(a.createdAt, b.createdAt);
          return direction === 'asc' ? d : -d;
        }
        case 'updatedAt': {
          const d = this.compareTimeAsc(a.updatedAt, b.updatedAt);
          return direction === 'asc' ? d : -d;
        }
        case 'distanceKm':
          return this.compareDistanceKm(a, b, direction);
        default:
          return 0;
      }
    });
    return next;
  }

  private parseRouteIdForSort(id: string): number {
    const n = Number.parseInt(id, 10);
    return Number.isFinite(n) ? n : 0;
  }

  private compareTimeAsc(isoA: string, isoB: string): number {
    const ta = new Date(isoA).getTime();
    const tb = new Date(isoB).getTime();
    const va = Number.isFinite(ta) ? ta : 0;
    const vb = Number.isFinite(tb) ? tb : 0;
    return va - vb;
  }

  /** Порівняння довжини: null завжди після всіх значень; asc — від меншої км до більшої. */
  private compareDistanceKm(
    a: RouteCardViewModel,
    b: RouteCardViewModel,
    direction: RoutesToolbarSortDirection
  ): number {
    const na = a.distanceKm == null;
    const nb = b.distanceKm == null;
    if (na && nb) {
      return 0;
    }
    if (na) {
      return 1;
    }
    if (nb) {
      return -1;
    }
    const d = a.distanceKm! - b.distanceKm!;
    return direction === 'asc' ? d : -d;
  }

  private mapToCard(summary: RouteSummaryContractDto, points: RoutePointContract[]): RouteCardViewModel {
    return {
      id: summary.id,
      title: summary.title,
      distanceKm: summary.distanceKm,
      createdAt: summary.createdAt,
      updatedAt: summary.updatedAt,
      lastOpenedAt: summary.lastOpenedAt,
      lockedByRequest: summary.lockedByRequest ?? false,
      deleted: summary.deleted ?? false,
      points: [...points].sort((first: RoutePointContract, second: RoutePointContract) => first.order - second.order)
    };
  }

  private async deleteRoute(routeId: string): Promise<void> {
    this.deleteFailed.set(false);
    this.deletingRouteId.set(routeId);
    try {
      await this.routesApi.deleteMyRoute(routeId);
      this.allRouteCards.update((currentCards) =>
        currentCards.map((card) => (card.id === routeId ? { ...card, deleted: true } : card))
      );
    } catch {
      this.deleteFailed.set(true);
    } finally {
      this.deletingRouteId.set(null);
    }
  }

  private showToast(key: string): void {
    this.toastMessage.set(key);
    setTimeout(() => this.toastMessage.set(''), 1800);
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
}

interface RouteCardViewModel {
  id: string;
  title: string;
  distanceKm: number | null;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt: string | null;
  lockedByRequest: boolean;
  deleted: boolean;
  points: RoutePointContract[];
}
