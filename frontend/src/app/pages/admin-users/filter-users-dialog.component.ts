import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TranslateModule } from '@ngx-translate/core';
import { AdminUserRole } from '../../core/api';

export interface UserFilterValues {
  email: string;
  role: '' | AdminUserRole;
  active: '' | 'true' | 'false';
  deleted: '' | 'true' | 'false';
}

export interface FilterUsersDialogData {
  filters: UserFilterValues;
  roleOptions: readonly AdminUserRole[];
}

export type FilterUsersDialogResult =
  | { action: 'apply'; values: UserFilterValues }
  | { action: 'reset' };

const DEFAULT_FILTERS: UserFilterValues = {
  email: '',
  role: '',
  active: '',
  deleted: 'false'
};

@Component({
  selector: 'app-filter-users-dialog',
  standalone: true,
  imports: [
    TranslateModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule
  ],
  templateUrl: './filter-users-dialog.component.html',
  styleUrl: './filter-users-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FilterUsersDialogComponent {
  readonly data = inject<FilterUsersDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<FilterUsersDialogComponent, FilterUsersDialogResult>);
  private readonly formBuilder = inject(FormBuilder);

  readonly filterForm = this.formBuilder.nonNullable.group({
    email: [this.data.filters.email],
    role: [this.data.filters.role],
    active: [this.data.filters.active],
    deleted: [this.data.filters.deleted || DEFAULT_FILTERS.deleted]
  });

  cancel(): void {
    this.dialogRef.close();
  }

  apply(): void {
    this.dialogRef.close({
      action: 'apply',
      values: this.filterForm.getRawValue()
    });
  }

  reset(): void {
    this.filterForm.reset(DEFAULT_FILTERS);
    this.dialogRef.close({ action: 'reset' });
  }
}
