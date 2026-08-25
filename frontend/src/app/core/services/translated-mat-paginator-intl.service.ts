import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { TranslateService } from '@ngx-translate/core';

const PAGINATOR_KEYS = {
  itemsPerPage: 'common.paginator.itemsPerPage',
  nextPage: 'common.paginator.nextPage',
  previousPage: 'common.paginator.previousPage',
  firstPage: 'common.paginator.firstPage',
  lastPage: 'common.paginator.lastPage',
  range: 'common.paginator.range',
  rangeEmpty: 'common.paginator.rangeEmpty'
} as const;

/**
 * Локалізовані підписи MatPaginator (ngx-translate).
 */
@Injectable({ providedIn: 'root' })
export class TranslatedMatPaginatorIntl extends MatPaginatorIntl {
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    super();
    this.translate
      .stream(Object.values(PAGINATOR_KEYS))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((labels) => {
        this.itemsPerPageLabel = labels[PAGINATOR_KEYS.itemsPerPage];
        this.nextPageLabel = labels[PAGINATOR_KEYS.nextPage];
        this.previousPageLabel = labels[PAGINATOR_KEYS.previousPage];
        this.firstPageLabel = labels[PAGINATOR_KEYS.firstPage];
        this.lastPageLabel = labels[PAGINATOR_KEYS.lastPage];
        this.changes.next();
      });
  }

  override getRangeLabel = (page: number, pageSize: number, length: number): string => {
    if (length === 0 || pageSize === 0) {
      return this.translate.instant(PAGINATOR_KEYS.rangeEmpty, { length });
    }
    const startIndex = page * pageSize;
    const endIndex = Math.min(startIndex + pageSize, length);
    return this.translate.instant(PAGINATOR_KEYS.range, {
      start: startIndex + 1,
      end: endIndex,
      length
    });
  };
}
