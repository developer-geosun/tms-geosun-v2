import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { BackendApiService } from './backend-api.service';
import {
  CreateFreightNumericScenarioContractRequest,
  FreightNumericScenarioContractDto,
  UpdateFreightNumericScenarioContractRequest
} from './freight-numeric-scenarios-contracts.model';

@Injectable({ providedIn: 'root' })
export class FreightNumericScenariosApiService {
  private readonly http = inject(HttpClient);
  private readonly backendApi = inject(BackendApiService);

  async list(activeOnly = false): Promise<FreightNumericScenarioContractDto[]> {
    const params = new HttpParams().set('activeOnly', String(activeOnly));
    return firstValueFrom(
      this.http.get<FreightNumericScenarioContractDto[]>(this.backendApi.adminFreightNumericScenarios, {
        params
      })
    );
  }

  async getById(id: string): Promise<FreightNumericScenarioContractDto> {
    return firstValueFrom(
      this.http.get<FreightNumericScenarioContractDto>(
        `${this.backendApi.adminFreightNumericScenarios}/${encodeURIComponent(id)}`
      )
    );
  }

  async create(
    payload: CreateFreightNumericScenarioContractRequest
  ): Promise<FreightNumericScenarioContractDto> {
    return firstValueFrom(
      this.http.post<FreightNumericScenarioContractDto>(this.backendApi.adminFreightNumericScenarios, payload)
    );
  }

  async update(
    id: string,
    payload: UpdateFreightNumericScenarioContractRequest
  ): Promise<FreightNumericScenarioContractDto> {
    return firstValueFrom(
      this.http.put<FreightNumericScenarioContractDto>(
        `${this.backendApi.adminFreightNumericScenarios}/${encodeURIComponent(id)}`,
        payload
      )
    );
  }

  async delete(id: string): Promise<void> {
    await firstValueFrom(
      this.http.delete<void>(`${this.backendApi.adminFreightNumericScenarios}/${encodeURIComponent(id)}`)
    );
  }
}
