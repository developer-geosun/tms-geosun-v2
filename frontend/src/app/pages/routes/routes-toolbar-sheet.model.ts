import { Signal, WritableSignal } from '@angular/core';

export type RoutesToolbarListView = 'active' | 'all' | 'deleted';
export type RoutesToolbarSortKey = 'id' | 'createdAt' | 'updatedAt' | 'distanceKm';
export type RoutesToolbarSortDirection = 'asc' | 'desc';

/** Дані для MatBottomSheet: ті самі сигнали, що й у сторінці маршрутів. */
export interface RoutesToolbarSheetData {
  listView: WritableSignal<RoutesToolbarListView>;
  sortBy: WritableSignal<RoutesToolbarSortKey>;
  sortDirection: WritableSignal<RoutesToolbarSortDirection>;
  isBusy: Signal<boolean>;
}
