import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { BackendApiService } from './backend-api.service';
import {
  CurrencyContractDto,
  NbuRatesSnapshotContractDto,
  SyncNbuRatesContractResponse,
  UpdateCurrencyContractRequest
} from './currencies-contracts.model';

@Injectable({ providedIn: 'root' })
export class CurrenciesApiService {
  private readonly http = inject(HttpClient);
  private readonly backendApi = inject(BackendApiService);

  async list(activeOnly = false): Promise<CurrencyContractDto[]> {
    const params = new HttpParams().set('activeOnly', String(activeOnly));
    return firstValueFrom(
      this.http.get<CurrencyContractDto[]>(this.backendApi.adminCurrencies, { params })
    );
  }

  async update(code: string, payload: UpdateCurrencyContractRequest): Promise<CurrencyContractDto> {
    return firstValueFrom(
      this.http.patch<CurrencyContractDto>(
        `${this.backendApi.adminCurrencies}/${encodeURIComponent(code)}`,
        payload
      )
    );
  }

  async syncNbuRates(): Promise<SyncNbuRatesContractResponse> {
    return firstValueFrom(
      this.http.post<SyncNbuRatesContractResponse>(
        `${this.backendApi.adminCurrencies}/nbu-rates/sync`,
        null
      )
    );
  }

  async getLatestNbuRates(): Promise<NbuRatesSnapshotContractDto> {
    return this.getNbuRates();
  }

  async getNbuRates(rateDate?: string): Promise<NbuRatesSnapshotContractDto> {
    let params = new HttpParams();
    if (rateDate?.trim()) {
      params = params.set('rateDate', rateDate.trim());
    }
    return firstValueFrom(
      this.http.get<NbuRatesSnapshotContractDto>(`${this.backendApi.adminCurrencies}/nbu-rates`, { params })
    );
  }
}
