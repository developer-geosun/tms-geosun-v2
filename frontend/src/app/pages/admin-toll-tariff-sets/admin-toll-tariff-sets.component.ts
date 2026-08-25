import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  signal,
  ViewChild
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule, Sort } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import {
  CountryReferenceApiService,
  CountryReferenceContractDto,
  CountryTollRuleContractDto,
  CreateCountryTollRuleContractRequest,
  CreateTollTariffSetContractRequest,
  TollTariffSetContractDto,
  TollTariffSetsApiService,
  TollTypeContract,
  UpdateCountryTollRuleContractRequest,
  UpdateTollTariffSetContractRequest
} from '../../core/api';
import {
  countryReferenceLocalizedName,
  countryReferenceSelectLabel
} from '../../core/utils/country-reference-localized-name';
import { LanguageService } from '../../core/services/language.service';
import { LayoutService } from '../../core/layout';
import { parseOptionalFormNumber } from '../../core/utils/parse-optional-form-number';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-admin-toll-tariff-sets',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatSelectModule,
    MatCheckboxModule,
    MatTooltipModule,
    MatDialogModule
  ],
  templateUrl: './admin-toll-tariff-sets.component.html',
  styleUrl: './admin-toll-tariff-sets.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminTollTariffSetsComponent implements AfterViewInit {
  private static readonly RULES_DESKTOP_PAGE_SIZE = 10;
  private static readonly RULES_HANDSET_PAGE_SIZE = 5;

  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly tollApi = inject(TollTariffSetsApiService);
  private readonly countryReferenceApi = inject(CountryReferenceApiService);
  private readonly languageService = inject(LanguageService);
  private readonly layout = inject(LayoutService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(MatDialog);

  readonly tollTypeOptions: TollTypeContract[] = ['EUR_PER_KM', 'EUR_PER_DAY'];
  readonly setColumns = ['name', 'isActive', 'actions'];
  readonly ruleColumns = ['countryCode', 'countryName', 'tollType', 'rate', 'fixedDays', 'isActive', 'actions'];
  readonly rulesDataSource = new MatTableDataSource<CountryTollRuleContractDto>([]);
  readonly rulesPageSizeOptions = [5, 10, 25, 50];
  readonly rulesPageSize = signal(AdminTollTariffSetsComponent.RULES_DESKTOP_PAGE_SIZE);
  private readonly countries = signal<CountryReferenceContractDto[]>([]);

  @ViewChild('rulesPaginator') private rulesPaginator?: MatPaginator;
  @ViewChild('rulesSort') private rulesSort?: MatSort;

  readonly countrySelectOptions = computed(() => {
    const language = this.languageService.language();
    const locale = language === 'en' ? 'en' : language === 'ru' ? 'ru' : 'uk';
    return this.countries()
      .map((country) => ({
        code: country.codeAlpha2.toUpperCase(),
        label: countryReferenceSelectLabel(country, language)
      }))
      .sort((a, b) => a.label.localeCompare(b.label, locale));
  });

  readonly countrySearchControl = this.formBuilder.nonNullable.control('');
  private readonly countrySearchQuery = signal('');

  readonly filteredCountryOptions = computed(() => {
    const query = this.countrySearchQuery().trim().toLowerCase();
    const options = this.countrySelectOptions();
    if (!query) {
      return options;
    }
    return options.filter((option) => this.matchesCountrySearch(option, query));
  });

  private readonly countryNamesByCode = computed(() => {
    const language = this.languageService.language();
    const map: Record<string, string> = {};
    for (const country of this.countries()) {
      map[country.codeAlpha2.toUpperCase()] = countryReferenceLocalizedName(country, language);
    }
    return map;
  });

  readonly isLoadingSets = signal(false);
  readonly isLoadingRules = signal(false);
  readonly loadError = signal('');
  readonly actionError = signal('');
  readonly actionSuccess = signal('');
  readonly sets = signal<TollTariffSetContractDto[]>([]);
  readonly rules = signal<CountryTollRuleContractDto[]>([]);
  readonly selectedSetId = signal<string | null>(null);
  readonly editingSetId = signal<string | null>(null);
  readonly editingRuleId = signal<string | null>(null);

  readonly selectedSet = computed(
    () => this.sets().find((set) => set.id === this.selectedSetId()) ?? null
  );

  readonly setForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(128)]],
    description: [''],
    isActive: [true]
  });

  readonly ruleForm = this.formBuilder.nonNullable.group({
    countryCode: ['', Validators.required],
    tollType: ['EUR_PER_KM' as TollTypeContract, Validators.required],
    rate: ['', Validators.required],
    fixedDays: [''],
    isActive: [true]
  });

  constructor() {
    this.rulesDataSource.sortData = this.sortRules.bind(this);

    this.countrySearchControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        const query = value ?? '';
        this.countrySearchQuery.set(query);
        const resolvedCode = this.resolveCountryCodeFromSearch(query);
        this.ruleForm.controls.countryCode.setValue(resolvedCode ?? '', { emitEvent: false });
      });

    effect(() => {
      this.languageService.language();
      this.countrySelectOptions();
      if (this.ruleForm.controls.countryCode.value) {
        this.syncCountrySearchFromCode();
      }
    });

    effect(() => {
      this.layout.isHandset();
      this.applyDefaultRulesPageSizeForViewport();
    });

    void this.loadCountries();
    void this.loadSets();
  }

  private applyDefaultRulesPageSizeForViewport(): void {
    const size = this.layout.handsetPageSize(
      AdminTollTariffSetsComponent.RULES_DESKTOP_PAGE_SIZE,
      AdminTollTariffSetsComponent.RULES_HANDSET_PAGE_SIZE
    );
    this.rulesPageSize.set(size);
    if (this.rulesPaginator) {
      this.rulesPaginator.pageSize = size;
      this.rulesPaginator.pageIndex = 0;
    }
  }

  ngAfterViewInit(): void {
    this.syncRulesTableControls();
    this.refreshRulesTableData();
  }

  onCountryOptionSelected(event: MatAutocompleteSelectedEvent): void {
    const code = String(event.option.value ?? '').trim().toUpperCase();
    if (!code) {
      return;
    }
    this.ruleForm.controls.countryCode.setValue(code);
    this.syncCountrySearchFromCode();
  }

  onCountrySearchBlur(): void {
    const query = this.countrySearchControl.value.trim();
    if (!query) {
      this.ruleForm.controls.countryCode.setValue('');
      return;
    }
    const resolvedCode = this.resolveCountryCodeFromSearch(query);
    if (resolvedCode) {
      this.ruleForm.controls.countryCode.setValue(resolvedCode);
      this.syncCountrySearchFromCode();
    }
  }

  countryName(code: string): string {
    const normalized = code.trim().toUpperCase();
    return this.countryNamesByCode()[normalized] ?? '—';
  }

  private async loadCountries(): Promise<void> {
    try {
      this.countries.set(await this.countryReferenceApi.list());
    } catch {
      this.countries.set([]);
    }
  }

  async loadSets(): Promise<void> {
    this.isLoadingSets.set(true);
    this.loadError.set('');
    try {
      const sets = await this.tollApi.listSets(false);
      this.sets.set(sets);
      const selected = this.selectedSetId();
      if (!selected || !sets.some((set) => set.id === selected)) {
        this.selectedSetId.set(sets[0]?.id ?? null);
      }
      await this.loadRulesForSelected();
    } catch {
      this.sets.set([]);
      this.selectedSetId.set(null);
      this.setRules([]);
      this.loadError.set('pages.adminTollTariffSets.loadFailed');
    } finally {
      this.isLoadingSets.set(false);
    }
  }

  selectSet(set: TollTariffSetContractDto): void {
    this.selectedSetId.set(set.id);
    this.editingRuleId.set(null);
    this.resetRuleForm();
    void this.loadRulesForSelected();
  }

  startCreateSet(): void {
    this.editingSetId.set(null);
    this.setForm.reset({ name: '', description: '', isActive: true });
  }

  startEditSet(set: TollTariffSetContractDto): void {
    this.editingSetId.set(set.id);
    this.selectedSetId.set(set.id);
    this.setForm.patchValue({
      name: set.name,
      description: set.description ?? '',
      isActive: set.isActive
    });
    void this.loadRulesForSelected();
  }

  async saveSet(): Promise<void> {
    if (this.setForm.invalid) {
      this.actionError.set('pages.adminTollTariffSets.validationError');
      return;
    }
    const values = this.setForm.getRawValue();
    const payloadBase = {
      name: values.name.trim(),
      description: values.description.trim() || null,
      isActive: values.isActive
    };
    this.actionError.set('');
    this.actionSuccess.set('');
    try {
      const editingSetId = this.editingSetId();
      if (editingSetId) {
        const payload: UpdateTollTariffSetContractRequest = payloadBase;
        await this.tollApi.updateSet(editingSetId, payload);
        this.actionSuccess.set('pages.adminTollTariffSets.setUpdated');
      } else {
        const payload: CreateTollTariffSetContractRequest = payloadBase;
        const created = await this.tollApi.createSet(payload);
        this.selectedSetId.set(created.id);
        this.actionSuccess.set('pages.adminTollTariffSets.setCreated');
      }
      this.editingSetId.set(null);
      this.setForm.reset({ name: '', description: '', isActive: true });
      await this.loadSets();
    } catch {
      this.actionError.set('pages.adminTollTariffSets.setSaveFailed');
    }
  }

  async deleteSet(set: TollTariffSetContractDto): Promise<void> {
    const confirmed = await this.openConfirmDialog('pages.adminTollTariffSets.setDeleteConfirm');
    if (!confirmed) {
      return;
    }
    this.actionError.set('');
    try {
      await this.tollApi.deleteSet(set.id);
      if (this.selectedSetId() === set.id) {
        this.selectedSetId.set(null);
        this.setRules([]);
      }
      await this.loadSets();
      this.actionSuccess.set('pages.adminTollTariffSets.setDeleted');
    } catch {
      this.actionError.set('pages.adminTollTariffSets.setDeleteFailed');
    }
  }

  startCreateRule(): void {
    this.editingRuleId.set(null);
    this.resetRuleForm();
  }

  startEditRule(rule: CountryTollRuleContractDto): void {
    this.editingRuleId.set(rule.id);
    this.ruleForm.patchValue({
      countryCode: rule.countryCode.trim().toUpperCase(),
      tollType: rule.tollType,
      rate: String(rule.rate),
      fixedDays: rule.fixedDays != null ? String(rule.fixedDays) : '',
      isActive: rule.isActive
    });
    this.syncCountrySearchFromCode();
  }

  async saveRule(): Promise<void> {
    const setId = this.selectedSetId();
    if (!setId) {
      return;
    }
    const payload = this.toRulePayload();
    if (!payload) {
      this.actionError.set('pages.adminTollTariffSets.validationError');
      return;
    }
    this.actionError.set('');
    this.actionSuccess.set('');
    try {
      const editingRuleId = this.editingRuleId();
      if (editingRuleId) {
        await this.tollApi.updateRule(setId, editingRuleId, payload as UpdateCountryTollRuleContractRequest);
        this.actionSuccess.set('pages.adminTollTariffSets.ruleUpdated');
      } else {
        await this.tollApi.createRule(setId, payload as CreateCountryTollRuleContractRequest);
        this.actionSuccess.set('pages.adminTollTariffSets.ruleCreated');
      }
      this.startCreateRule();
      await this.loadRulesForSelected();
    } catch {
      this.actionError.set('pages.adminTollTariffSets.ruleSaveFailed');
    }
  }

  async deleteRule(rule: CountryTollRuleContractDto): Promise<void> {
    const setId = this.selectedSetId();
    if (!setId) {
      return;
    }
    const confirmed = await this.openConfirmDialog('pages.adminTollTariffSets.ruleDeleteConfirm');
    if (!confirmed) {
      return;
    }
    this.actionError.set('');
    try {
      await this.tollApi.deleteRule(setId, rule.id);
      if (this.editingRuleId() === rule.id) {
        this.startCreateRule();
      }
      await this.loadRulesForSelected();
      this.actionSuccess.set('pages.adminTollTariffSets.ruleDeleted');
    } catch {
      this.actionError.set('pages.adminTollTariffSets.ruleDeleteFailed');
    }
  }

  tollTypeLabel(type: TollTypeContract): string {
    return `pages.adminTollTariffSets.tollType.${type}`;
  }

  async backToRouteRequests(): Promise<void> {
    await this.router.navigate(['/admin/route-requests']);
  }

  private async loadRulesForSelected(): Promise<void> {
    const setId = this.selectedSetId();
    if (!setId) {
      this.setRules([]);
      return;
    }
    this.isLoadingRules.set(true);
    try {
      this.setRules(await this.tollApi.listRules(setId));
    } catch {
      this.setRules([]);
      this.actionError.set('pages.adminTollTariffSets.rulesLoadFailed');
    } finally {
      this.isLoadingRules.set(false);
    }
  }

  private setRules(rules: CountryTollRuleContractDto[]): void {
    this.rules.set(rules);
    this.refreshRulesTableData();
  }

  private refreshRulesTableData(): void {
    this.rulesDataSource.data = this.rules();
    queueMicrotask(() => {
      this.syncRulesTableControls();
      this.rulesPaginator?.firstPage();
    });
  }

  private syncRulesTableControls(): void {
    if (this.rulesPaginator) {
      this.rulesDataSource.paginator = this.rulesPaginator;
    }
    if (this.rulesSort) {
      this.rulesDataSource.sort = this.rulesSort;
    }
  }

  private sortRules(data: CountryTollRuleContractDto[], sort: Sort): CountryTollRuleContractDto[] {
    if (!sort.active || sort.direction === '') {
      return data;
    }
    const direction = sort.direction === 'asc' ? 1 : -1;
    return [...data].sort((a, b) => direction * this.compareRuleSortValues(a, b, sort.active));
  }

  private compareRuleSortValues(
    a: CountryTollRuleContractDto,
    b: CountryTollRuleContractDto,
    column: string
  ): number {
    const locale = this.sortLocale();
    switch (column) {
      case 'countryCode':
        return a.countryCode.localeCompare(b.countryCode);
      case 'countryName':
        return this.countryName(a.countryCode).localeCompare(this.countryName(b.countryCode), locale);
      case 'tollType':
        return a.tollType.localeCompare(b.tollType);
      case 'rate':
        return a.rate - b.rate;
      case 'fixedDays': {
        const aDays = a.fixedDays ?? Number.NEGATIVE_INFINITY;
        const bDays = b.fixedDays ?? Number.NEGATIVE_INFINITY;
        return aDays - bDays;
      }
      case 'isActive':
        return Number(a.isActive) - Number(b.isActive);
      default:
        return 0;
    }
  }

  private sortLocale(): string {
    const language = this.languageService.language();
    return language === 'en' ? 'en' : language === 'ru' ? 'ru' : 'uk';
  }

  private resetRuleForm(): void {
    this.ruleForm.reset({
      countryCode: '',
      tollType: 'EUR_PER_KM',
      rate: '',
      fixedDays: '',
      isActive: true
    });
    this.countrySearchControl.setValue('', { emitEvent: false });
    this.countrySearchQuery.set('');
  }

  private syncCountrySearchFromCode(): void {
    const code = this.ruleForm.controls.countryCode.value.trim().toUpperCase();
    const label = this.countrySelectOptions().find((option) => option.code === code)?.label ?? '';
    this.countrySearchControl.setValue(label, { emitEvent: false });
    this.countrySearchQuery.set(label);
  }

  private matchesCountrySearch(
    option: { code: string; label: string },
    query: string
  ): boolean {
    if (option.code.toLowerCase().startsWith(query)) {
      return true;
    }
    const namePart = option.label.slice(option.code.length).trim().toLowerCase();
    return namePart.startsWith(query) || option.label.toLowerCase().includes(query);
  }

  private resolveCountryCodeFromSearch(query: string): string | null {
    const normalized = query.trim();
    if (!normalized) {
      return null;
    }
    const options = this.countrySelectOptions();
    const upper = normalized.toUpperCase();
    const exactByCode = options.find((option) => option.code === upper);
    if (exactByCode) {
      return exactByCode.code;
    }
    const exactByLabel = options.find(
      (option) => option.label.toLowerCase() === normalized.toLowerCase()
    );
    if (exactByLabel) {
      return exactByLabel.code;
    }
    const filtered = options.filter((option) =>
      this.matchesCountrySearch(option, normalized.toLowerCase())
    );
    if (filtered.length === 1) {
      return filtered[0].code;
    }
    return null;
  }

  private toRulePayload():
    | CreateCountryTollRuleContractRequest
    | UpdateCountryTollRuleContractRequest
    | null {
    if (this.ruleForm.invalid) {
      return null;
    }
    const values = this.ruleForm.getRawValue();
    const rate = Number(values.rate);
    if (!Number.isFinite(rate)) {
      return null;
    }
    const fixedDays = parseOptionalFormNumber(values.fixedDays);
    const editingRuleId = this.editingRuleId();
    if (editingRuleId) {
      return {
        tollType: values.tollType,
        rate,
        fixedDays,
        countryCode: values.countryCode.trim().toUpperCase(),
        isActive: values.isActive
      };
    }
    return {
      countryCode: values.countryCode.trim().toUpperCase(),
      tollType: values.tollType,
      rate,
      fixedDays,
      isActive: values.isActive
    };
  }

  private openConfirmDialog(messageKey: string): Promise<boolean> {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: { messageKey }
    });
    return firstValueFrom(ref.afterClosed()).then((result) => Boolean(result));
  }
}
