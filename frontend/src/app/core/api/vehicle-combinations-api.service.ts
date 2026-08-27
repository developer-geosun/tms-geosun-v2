import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { BackendApiService } from './backend-api.service';
import {
  CreateVehicleCombinationContractRequest,
  UpdateVehicleCombinationContractRequest,
  VehicleCombinationContractDto,
  VehicleCombinationListViewContract
} from './vehicle-combinations-contracts.model';

@Injectable({ providedIn: 'root' })
export class VehicleCombinationsApiService {
  private readonly http = inject(HttpClient);
  private readonly backendApi = inject(BackendApiService);

  async list(
    view: VehicleCombinationListViewContract = 'active'
  ): Promise<VehicleCombinationContractDto[]> {
    const params = new HttpParams().set('view', view);
    return firstValueFrom(
      this.http.get<VehicleCombinationContractDto[]>(this.backendApi.adminVehicleCombinations, {
        params
      })
    );
  }

  async getById(id: string): Promise<VehicleCombinationContractDto> {
    return firstValueFrom(
      this.http.get<VehicleCombinationContractDto>(
        `${this.backendApi.adminVehicleCombinations}/${encodeURIComponent(id)}`
      )
    );
  }

  async create(
    payload: CreateVehicleCombinationContractRequest
  ): Promise<VehicleCombinationContractDto> {
    return firstValueFrom(
      this.http.post<VehicleCombinationContractDto>(
        this.backendApi.adminVehicleCombinations,
        payload
      )
    );
  }

  async update(
    id: string,
    payload: UpdateVehicleCombinationContractRequest
  ): Promise<VehicleCombinationContractDto> {
    return firstValueFrom(
      this.http.put<VehicleCombinationContractDto>(
        `${this.backendApi.adminVehicleCombinations}/${encodeURIComponent(id)}`,
        payload
      )
    );
  }

  async softDelete(id: string): Promise<void> {
    await firstValueFrom(
      this.http.delete(
        `${this.backendApi.adminVehicleCombinations}/${encodeURIComponent(id)}`
      )
    );
  }

  async restore(id: string): Promise<VehicleCombinationContractDto> {
    return firstValueFrom(
      this.http.post<VehicleCombinationContractDto>(
        `${this.backendApi.adminVehicleCombinations}/${encodeURIComponent(id)}/restore`,
        {}
      )
    );
  }
}
