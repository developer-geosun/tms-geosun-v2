import { BreakpointObserver } from '@angular/cdk/layout';
import { Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LAYOUT_QUERIES } from './layout-breakpoints';

/** Сигнали viewport: handset / tablet / desktop / compact-split для карти. */
@Injectable({ providedIn: 'root' })
export class LayoutService {
  private readonly breakpointObserver = inject(BreakpointObserver);

  private readonly handset = signal(false);
  private readonly tablet = signal(false);
  private readonly desktop = signal(false);
  private readonly compactSplit = signal(false);

  readonly isHandset = this.handset.asReadonly();
  readonly isTablet = this.tablet.asReadonly();
  readonly isDesktop = this.desktop.asReadonly();
  /** ≤ compactSplitMax: split карта+панель стає однопанельним. */
  readonly isCompactSplit = this.compactSplit.asReadonly();

  /** Зручний computed: вузький UI (не desktop). */
  readonly isNarrow = computed(() => !this.desktop());

  constructor() {
    this.breakpointObserver
      .observe([
        LAYOUT_QUERIES.handset,
        LAYOUT_QUERIES.tablet,
        LAYOUT_QUERIES.desktop,
        LAYOUT_QUERIES.compactSplit
      ])
      .pipe(takeUntilDestroyed())
      .subscribe((state) => {
        this.handset.set(state.breakpoints[LAYOUT_QUERIES.handset] ?? false);
        this.tablet.set(state.breakpoints[LAYOUT_QUERIES.tablet] ?? false);
        this.desktop.set(state.breakpoints[LAYOUT_QUERIES.desktop] ?? false);
        this.compactSplit.set(state.breakpoints[LAYOUT_QUERIES.compactSplit] ?? false);
      });
  }

  /** pageSize для paginator: на handset менше рядків. */
  handsetPageSize(desktopDefault = 10, handsetDefault = 5): number {
    return this.handset() ? handsetDefault : desktopDefault;
  }
}
