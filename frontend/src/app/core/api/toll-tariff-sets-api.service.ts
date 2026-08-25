import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { BackendApiService } from './backend-api.service';
import {
  CountryTollRuleContractDto,
  CreateCountryTollRuleContractRequest,
  CreateTollTariffSetContractRequest,
  TollTariffSetContractDto,
  UpdateCountryTollRuleContractRequest,
  UpdateTollTariffSetContractRequest
} from './toll-tariff-sets-contracts.model';

@Injectable({ providedIn: 'root' })
export class TollTariffSetsApiService {
  private readonly http = inject(HttpClient);
  private readonly backendApi = inject(BackendApiService);

  async listSets(activeOnly = false): Promise<TollTariffSetContractDto[]> {
    const params = new HttpParams().set('activeOnly', String(activeOnly));
    return firstValueFrom(
      this.http.get<TollTariffSetContractDto[]>(this.backendApi.adminTollTariffSets, { params })
    );
  }

  async getSetById(id: string): Promise<TollTariffSetContractDto> {
    return firstValueFrom(
      this.http.get<TollTariffSetContractDto>(
        `${this.backendApi.adminTollTariffSets}/${encodeURIComponent(id)}`
      )
    );
  }

  async createSet(payload: CreateTollTariffSetContractRequest): Promise<TollTariffSetContractDto> {
    return firstValueFrom(
      this.http.post<TollTariffSetContractDto>(this.backendApi.adminTollTariffSets, payload)
    );
  }

  async updateSet(id: string, payload: UpdateTollTariffSetContractRequest): Promise<TollTariffSetContractDto> {
    return firstValueFrom(
      this.http.put<TollTariffSetContractDto>(
        `${this.backendApi.adminTollTariffSets}/${encodeURIComponent(id)}`,
        payload
      )
    );
  }

  async deleteSet(id: string): Promise<void> {
    await firstValueFrom(
      this.http.delete<void>(`${this.backendApi.adminTollTariffSets}/${encodeURIComponent(id)}`)
    );
  }

  async listRules(setId: string): Promise<CountryTollRuleContractDto[]> {
    return firstValueFrom(
      this.http.get<CountryTollRuleContractDto[]>(
        `${this.backendApi.adminTollTariffSets}/${encodeURIComponent(setId)}/country-toll-rules`
      )
    );
  }

  async createRule(
    setId: string,
    payload: CreateCountryTollRuleContractRequest
  ): Promise<CountryTollRuleContractDto> {
    return firstValueFrom(
      this.http.post<CountryTollRuleContractDto>(
        `${this.backendApi.adminTollTariffSets}/${encodeURIComponent(setId)}/country-toll-rules`,
        payload
      )
    );
  }

  async updateRule(
    setId: string,
    ruleId: string,
    payload: UpdateCountryTollRuleContractRequest
  ): Promise<CountryTollRuleContractDto> {
    return firstValueFrom(
      this.http.put<CountryTollRuleContractDto>(
        `${this.backendApi.adminTollTariffSets}/${encodeURIComponent(setId)}/country-toll-rules/${encodeURIComponent(ruleId)}`,
        payload
      )
    );
  }

  async deleteRule(setId: string, ruleId: string): Promise<void> {
    await firstValueFrom(
      this.http.delete<void>(
        `${this.backendApi.adminTollTariffSets}/${encodeURIComponent(setId)}/country-toll-rules/${encodeURIComponent(ruleId)}`
      )
    );
  }
}
