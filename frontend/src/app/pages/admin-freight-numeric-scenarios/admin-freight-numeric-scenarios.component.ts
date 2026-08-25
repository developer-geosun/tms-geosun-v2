import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import {
  CreateFreightNumericScenarioContractRequest,
  FreightNumericScenarioContractDto,
  FreightNumericScenariosApiService,
  MarginTypeContract,
  SeasonModeContract,
  TollTariffSetsApiService,
  TollTariffSetContractDto,
  UpdateFreightNumericScenarioContractRequest
} from '../../core/api';
import { LayoutService } from '../../core/layout';
import { parseOptionalFormNumber } from '../../core/utils/parse-optional-form-number';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-admin-freight-numeric-scenarios',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatTooltipModule,
    MatDialogModule
  ],
  templateUrl: './admin-freight-numeric-scenarios.component.html',
  styleUrl: './admin-freight-numeric-scenarios.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminFreightNumericScenariosComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly scenariosApi = inject(FreightNumericScenariosApiService);
  private readonly tollTariffSetsApi = inject(TollTariffSetsApiService);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);
  private readonly layout = inject(LayoutService);

  private static readonly DESKTOP_DEFAULT_PAGE_SIZE = 10;
  private static readonly HANDSET_DEFAULT_PAGE_SIZE = 5;

  readonly seasonModeOptions: SeasonModeContract[] = ['AUTO', 'WINTER', 'NON_WINTER'];
  readonly marginTypeOptions: MarginTypeContract[] = ['PERCENT_OF_COST_BEFORE_MARGIN', 'FIXED_PER_TRIP'];

  readonly displayedColumns = ['name', 'proposalCurrency', 'isActive', 'updatedAt', 'actions'];
  readonly isLoading = signal(false);
  readonly loadError = signal('');
  readonly actionError = signal('');
  readonly actionSuccess = signal('');
  readonly scenarios = signal<FreightNumericScenarioContractDto[]>([]);
  readonly tollTariffSets = signal<TollTariffSetContractDto[]>([]);
  readonly editingId = signal<string | null>(null);

  readonly pageIndex = signal(0);
  readonly pageSize = signal(AdminFreightNumericScenariosComponent.DESKTOP_DEFAULT_PAGE_SIZE);
  readonly pageSizeOptions = [5, 10, 25, 50];

  readonly pagedScenarios = computed(() => {
    const all = this.scenarios();
    const start = this.pageIndex() * this.pageSize();
    return all.slice(start, start + this.pageSize());
  });

  readonly scenarioForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(128)]],
    description: [''],
    isActive: [true],
    fuelConsumptionEmptyLPer100km: ['', Validators.required],
    fuelConsumptionLoadedNonWinterLPer100km: ['', Validators.required],
    fuelConsumptionLoadedWinterLPer100km: ['', Validators.required],
    seasonMode: ['AUTO' as SeasonModeContract, Validators.required],
    fuelPricePerLiter: ['', Validators.required],
    driverSalaryPercentOfFreight: ['', Validators.required],
    perDiemAmountPerDay: ['', Validators.required],
    perDiemRouteDivisorKm: ['', Validators.required],
    perDiemFixedExtraDays: ['', Validators.required],
    marginType: ['PERCENT_OF_COST_BEFORE_MARGIN' as MarginTypeContract, Validators.required],
    marginPercent: [''],
    marginFixedAmount: [''],
    proposalCurrency: ['EUR', [Validators.required, Validators.minLength(3), Validators.maxLength(3)]],
    tollTariffSetId: ['', Validators.required]
  });

  constructor() {
    this.scenarioForm.controls.marginType.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((marginType) => this.syncMarginFieldAvailability(marginType));
    this.syncMarginFieldAvailability(this.scenarioForm.controls.marginType.value);
    effect(() => {
      this.layout.isHandset();
      this.applyDefaultPageSizeForViewport();
    });
    void this.loadTollTariffSets();
    void this.loadScenarios();
  }

  private applyDefaultPageSizeForViewport(): void {
    const size = this.layout.handsetPageSize(
      AdminFreightNumericScenariosComponent.DESKTOP_DEFAULT_PAGE_SIZE,
      AdminFreightNumericScenariosComponent.HANDSET_DEFAULT_PAGE_SIZE
    );
    this.pageSize.set(size);
    this.pageIndex.set(0);
    this.clampPageIndex();
  }

  async loadTollTariffSets(): Promise<void> {
    try {
      this.tollTariffSets.set(await this.tollTariffSetsApi.listSets(false));
    } catch {
      this.tollTariffSets.set([]);
    }
  }

  async loadScenarios(): Promise<void> {
    this.isLoading.set(true);
    this.loadError.set('');
    try {
      this.scenarios.set(await this.scenariosApi.list(false));
      this.clampPageIndex();
    } catch {
      this.scenarios.set([]);
      this.pageIndex.set(0);
      this.loadError.set('pages.adminFreightNumericScenarios.loadFailed');
    } finally {
      this.isLoading.set(false);
    }
  }

  onScenariosPageChange(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.clampPageIndex();
  }

  private clampPageIndex(): void {
    const total = this.scenarios().length;
    const size = this.pageSize();
    const maxIndex = Math.max(0, Math.ceil(total / size) - 1);
    if (this.pageIndex() > maxIndex) {
      this.pageIndex.set(maxIndex);
    }
  }

  startCreate(): void {
    this.editingId.set(null);
    this.scenarioForm.reset({
      name: '',
      description: '',
      isActive: true,
      fuelConsumptionEmptyLPer100km: '',
      fuelConsumptionLoadedNonWinterLPer100km: '',
      fuelConsumptionLoadedWinterLPer100km: '',
      seasonMode: 'AUTO',
      fuelPricePerLiter: '',
      driverSalaryPercentOfFreight: '',
      perDiemAmountPerDay: '',
      perDiemRouteDivisorKm: '',
      perDiemFixedExtraDays: '',
      marginType: 'PERCENT_OF_COST_BEFORE_MARGIN',
      marginPercent: '',
      marginFixedAmount: '',
      proposalCurrency: 'EUR',
      tollTariffSetId: ''
    });
    this.syncMarginFieldAvailability('PERCENT_OF_COST_BEFORE_MARGIN');
  }

  startEdit(scenario: FreightNumericScenarioContractDto): void {
    this.editingId.set(scenario.id);
    this.scenarioForm.patchValue({
      name: scenario.name,
      description: scenario.description ?? '',
      isActive: scenario.isActive,
      fuelConsumptionEmptyLPer100km: String(scenario.fuelConsumptionEmptyLPer100km),
      fuelConsumptionLoadedNonWinterLPer100km: String(scenario.fuelConsumptionLoadedNonWinterLPer100km),
      fuelConsumptionLoadedWinterLPer100km: String(scenario.fuelConsumptionLoadedWinterLPer100km),
      seasonMode: scenario.seasonMode,
      fuelPricePerLiter: String(scenario.fuelPricePerLiter),
      driverSalaryPercentOfFreight: String(scenario.driverSalaryPercentOfFreight),
      perDiemAmountPerDay: String(scenario.perDiemAmountPerDay),
      perDiemRouteDivisorKm: String(scenario.perDiemRouteDivisorKm),
      perDiemFixedExtraDays: String(scenario.perDiemFixedExtraDays),
      marginType: scenario.marginType,
      marginPercent: scenario.marginPercent != null ? String(scenario.marginPercent) : '',
      marginFixedAmount: scenario.marginFixedAmount != null ? String(scenario.marginFixedAmount) : '',
      proposalCurrency: scenario.proposalCurrency,
      tollTariffSetId: scenario.tollTariffSetId
    });
    this.syncMarginFieldAvailability(scenario.marginType);
  }

  async saveScenario(): Promise<void> {
    const payload = this.toPayload();
    if (!payload) {
      this.actionError.set('pages.adminFreightNumericScenarios.validationError');
      return;
    }
    this.actionError.set('');
    this.actionSuccess.set('');
    try {
      const editingId = this.editingId();
      if (editingId) {
        await this.scenariosApi.update(editingId, payload);
        this.actionSuccess.set('pages.adminFreightNumericScenarios.updated');
      } else {
        await this.scenariosApi.create(payload);
        this.actionSuccess.set('pages.adminFreightNumericScenarios.created');
      }
      this.startCreate();
      await this.loadScenarios();
    } catch {
      this.actionError.set('pages.adminFreightNumericScenarios.saveFailed');
    }
  }

  async duplicateScenario(scenario: FreightNumericScenarioContractDto): Promise<void> {
    this.actionError.set('');
    this.actionSuccess.set('');
    const payload: CreateFreightNumericScenarioContractRequest = {
      name: this.buildCloneName(scenario.name),
      description: scenario.description,
      isActive: scenario.isActive,
      fuelConsumptionEmptyLPer100km: scenario.fuelConsumptionEmptyLPer100km,
      fuelConsumptionLoadedNonWinterLPer100km: scenario.fuelConsumptionLoadedNonWinterLPer100km,
      fuelConsumptionLoadedWinterLPer100km: scenario.fuelConsumptionLoadedWinterLPer100km,
      seasonMode: scenario.seasonMode,
      fuelPricePerLiter: scenario.fuelPricePerLiter,
      driverSalaryPercentOfFreight: scenario.driverSalaryPercentOfFreight,
      perDiemAmountPerDay: scenario.perDiemAmountPerDay,
      perDiemRouteDivisorKm: scenario.perDiemRouteDivisorKm,
      perDiemFixedExtraDays: scenario.perDiemFixedExtraDays,
      marginType: scenario.marginType,
      marginPercent: scenario.marginPercent,
      marginFixedAmount: scenario.marginFixedAmount,
      proposalCurrency: scenario.proposalCurrency,
      tollTariffSetId: scenario.tollTariffSetId
    };
    try {
      await this.scenariosApi.create(payload);
      this.actionSuccess.set('pages.adminFreightNumericScenarios.duplicated');
      await this.loadScenarios();
    } catch {
      this.actionError.set('pages.adminFreightNumericScenarios.duplicateFailed');
    }
  }

  async deleteScenario(scenario: FreightNumericScenarioContractDto): Promise<void> {
    const confirmed = await this.openConfirmDialog('pages.adminFreightNumericScenarios.deleteConfirm');
    if (!confirmed) {
      return;
    }
    this.actionError.set('');
    try {
      await this.scenariosApi.delete(scenario.id);
      if (this.editingId() === scenario.id) {
        this.startCreate();
      }
      await this.loadScenarios();
      this.actionSuccess.set('pages.adminFreightNumericScenarios.deleted');
    } catch {
      this.actionError.set('pages.adminFreightNumericScenarios.deleteFailed');
    }
  }

  /** Додає суфікс « clone» до назви, не перевищуючи ліміт 128 символів. */
  private buildCloneName(name: string): string {
    const suffix = ' clone';
    const maxLen = 128;
    const base = name.trim();
    if (base.length + suffix.length <= maxLen) {
      return `${base}${suffix}`;
    }
    return `${base.slice(0, maxLen - suffix.length)}${suffix}`;
  }

  async backToRouteRequests(): Promise<void> {
    await this.router.navigate(['/admin/route-requests']);
  }

  seasonModeLabel(mode: SeasonModeContract): string {
    return `pages.adminFreightNumericScenarios.seasonMode.${mode}`;
  }

  marginTypeLabel(type: MarginTypeContract): string {
    return `pages.adminFreightNumericScenarios.marginType.${type}`;
  }

  /** Активує лише поле, що відповідає обраному типу маржі. */
  private syncMarginFieldAvailability(marginType: MarginTypeContract): void {
    const percentCtrl = this.scenarioForm.controls.marginPercent;
    const fixedCtrl = this.scenarioForm.controls.marginFixedAmount;
    if (marginType === 'FIXED_PER_TRIP') {
      percentCtrl.disable({ emitEvent: false });
      fixedCtrl.enable({ emitEvent: false });
    } else {
      fixedCtrl.disable({ emitEvent: false });
      percentCtrl.enable({ emitEvent: false });
    }
  }

  private toPayload():
    | CreateFreightNumericScenarioContractRequest
    | UpdateFreightNumericScenarioContractRequest
    | null {
    if (this.scenarioForm.invalid) {
      return null;
    }
    const values = this.scenarioForm.getRawValue();
    const fuelConsumptionEmptyLPer100km = Number(values.fuelConsumptionEmptyLPer100km);
    const fuelConsumptionLoadedNonWinterLPer100km = Number(values.fuelConsumptionLoadedNonWinterLPer100km);
    const fuelConsumptionLoadedWinterLPer100km = Number(values.fuelConsumptionLoadedWinterLPer100km);
    const fuelPricePerLiter = Number(values.fuelPricePerLiter);
    const driverSalaryPercentOfFreight = Number(values.driverSalaryPercentOfFreight);
    const perDiemAmountPerDay = Number(values.perDiemAmountPerDay);
    const perDiemRouteDivisorKm = Number(values.perDiemRouteDivisorKm);
    const perDiemFixedExtraDays = Number(values.perDiemFixedExtraDays);
    if (
      ![
        fuelConsumptionEmptyLPer100km,
        fuelConsumptionLoadedNonWinterLPer100km,
        fuelConsumptionLoadedWinterLPer100km,
        fuelPricePerLiter,
        driverSalaryPercentOfFreight,
        perDiemAmountPerDay,
        perDiemRouteDivisorKm,
        perDiemFixedExtraDays
      ].every((value) => Number.isFinite(value))
    ) {
      return null;
    }
    const isFixed = values.marginType === 'FIXED_PER_TRIP';
    return {
      name: values.name.trim(),
      description: values.description.trim() || null,
      isActive: values.isActive,
      fuelConsumptionEmptyLPer100km,
      fuelConsumptionLoadedNonWinterLPer100km,
      fuelConsumptionLoadedWinterLPer100km,
      seasonMode: values.seasonMode,
      fuelPricePerLiter,
      driverSalaryPercentOfFreight,
      perDiemAmountPerDay,
      perDiemRouteDivisorKm: Math.trunc(perDiemRouteDivisorKm),
      perDiemFixedExtraDays: Math.trunc(perDiemFixedExtraDays),
      marginType: values.marginType,
      marginPercent: isFixed ? null : parseOptionalFormNumber(values.marginPercent),
      marginFixedAmount: isFixed ? parseOptionalFormNumber(values.marginFixedAmount) : null,
      proposalCurrency: values.proposalCurrency.trim().toUpperCase(),
      tollTariffSetId: values.tollTariffSetId
    };
  }

  private openConfirmDialog(messageKey: string): Promise<boolean> {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: { messageKey }
    });
    return firstValueFrom(ref.afterClosed()).then((result) => Boolean(result));
  }
}
