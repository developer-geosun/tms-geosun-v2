import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_BOTTOM_SHEET_DATA } from '@angular/material/bottom-sheet';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatRadioChange, MatRadioModule } from '@angular/material/radio';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import {
  RoutesToolbarSheetData,
  RoutesToolbarListView,
  RoutesToolbarSortDirection,
  RoutesToolbarSortKey
} from './routes-toolbar-sheet.model';

@Component({
  selector: 'app-routes-toolbar-bottom-sheet',
  standalone: true,
  imports: [TranslateModule, MatCardModule, MatRadioModule, MatButtonModule, MatIconModule],
  templateUrl: './routes-toolbar-bottom-sheet.component.html',
  styleUrl: './routes-toolbar-bottom-sheet.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RoutesToolbarBottomSheetComponent {
  readonly data = inject<RoutesToolbarSheetData>(MAT_BOTTOM_SHEET_DATA);

  /** Критерії сортування (рядок: радіо + стрілки лише для обраного). */
  readonly sortCriteria: readonly { value: RoutesToolbarSortKey; labelKey: string }[] = [
    { value: 'id', labelKey: 'pages.routes.sortById' },
    { value: 'createdAt', labelKey: 'pages.routes.sortByCreated' },
    { value: 'updatedAt', labelKey: 'pages.routes.sortByUpdated' },
    { value: 'distanceKm', labelKey: 'pages.routes.sortByDistance' }
  ];

  onListViewRadioChange(event: MatRadioChange): void {
    this.data.listView.set(event.value as RoutesToolbarListView);
  }

  onSortRadioChange(event: MatRadioChange): void {
    this.data.sortBy.set(event.value as RoutesToolbarSortKey);
  }

  onSortDirectionClick(direction: RoutesToolbarSortDirection): void {
    this.data.sortDirection.set(direction);
  }
}
