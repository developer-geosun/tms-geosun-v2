import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-route-delete-confirm-dialog',
  standalone: true,
  imports: [TranslateModule, MatDialogModule, MatButtonModule],
  templateUrl: './route-delete-confirm-dialog.component.html',
  styleUrl: './route-delete-confirm-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RouteDeleteConfirmDialogComponent {
  readonly data = inject(MAT_DIALOG_DATA) as RouteDeleteDialogData;
}

export interface RouteDeleteDialogData {
  routeTitle: string;
  routeCreatedAt: string;
  routeDistanceKm: string;
}
