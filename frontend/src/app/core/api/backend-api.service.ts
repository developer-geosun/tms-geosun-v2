import { Injectable, inject } from '@angular/core';
import { ConfigService } from '../services/config.service';

/**
 * Тонка обгортка для побудови URL backend API за contract-first підходом.
 * Мережеві виклики будуть додані у наступних фазах.
 */
@Injectable({
  providedIn: 'root'
})
export class BackendApiService {
  private readonly configService = inject(ConfigService);
  private readonly basePath = '/api/v1';

  get routes(): string {
    return this.build('/routes');
  }

  get myRoutes(): string {
    return this.build('/routes/my');
  }

  get routeRequests(): string {
    return this.build('/route-requests');
  }

  get myRouteRequests(): string {
    return this.build('/route-requests/my');
  }

  get adminRouteRequests(): string {
    return this.build('/admin/route-requests');
  }

  get adminQuotes(): string {
    return this.build('/admin/quotes');
  }

  get adminCurrencies(): string {
    return this.build('/admin/currencies');
  }

  get adminCountryReference(): string {
    return this.build('/admin/country-reference');
  }

  get adminFreightNumericScenarios(): string {
    return this.build('/admin/freight-numeric-scenarios');
  }

  get adminTollTariffSets(): string {
    return this.build('/admin/toll-tariff-sets');
  }

  /** Cost preview/calculations — вкладені під admin route requests. */
  get adminFreightCostCalculations(): string {
    return this.adminRouteRequests;
  }

  adminRouteRequestCostPreview(requestId: number | string): string {
    return `${this.adminRouteRequests}/${encodeURIComponent(String(requestId))}/cost-preview`;
  }

  adminRouteRequestCostCalculations(requestId: number | string): string {
    return `${this.adminRouteRequests}/${encodeURIComponent(String(requestId))}/cost-calculations`;
  }

  private build(path: string): string {
    return `${this.configService.apiUrl}${this.basePath}${path}`;
  }
}

