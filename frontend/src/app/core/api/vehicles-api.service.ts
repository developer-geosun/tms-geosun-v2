import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { BackendApiService } from './backend-api.service';
import { StoredFileContractDto } from './stored-files-contracts.model';
import {
  CreateVehicleContractRequest,
  RegistrationScanSideContract,
  UpdateVehicleContractRequest,
  VehicleContractDto,
  VehicleListViewContract
} from './vehicles-contracts.model';

@Injectable({ providedIn: 'root' })
export class VehiclesApiService {
  private readonly http = inject(HttpClient);
  private readonly backendApi = inject(BackendApiService);

  async list(view: VehicleListViewContract = 'active'): Promise<VehicleContractDto[]> {
    const params = new HttpParams().set('view', view);
    return firstValueFrom(
      this.http.get<VehicleContractDto[]>(this.backendApi.adminVehicles, { params })
    );
  }

  async getById(id: string): Promise<VehicleContractDto> {
    return firstValueFrom(
      this.http.get<VehicleContractDto>(
        `${this.backendApi.adminVehicles}/${encodeURIComponent(id)}`
      )
    );
  }

  async create(payload: CreateVehicleContractRequest): Promise<VehicleContractDto> {
    return firstValueFrom(
      this.http.post<VehicleContractDto>(this.backendApi.adminVehicles, payload)
    );
  }

  async update(id: string, payload: UpdateVehicleContractRequest): Promise<VehicleContractDto> {
    return firstValueFrom(
      this.http.put<VehicleContractDto>(
        `${this.backendApi.adminVehicles}/${encodeURIComponent(id)}`,
        payload
      )
    );
  }

  async softDelete(id: string): Promise<void> {
    await firstValueFrom(
      this.http.delete(`${this.backendApi.adminVehicles}/${encodeURIComponent(id)}`)
    );
  }

  async restore(id: string): Promise<VehicleContractDto> {
    return firstValueFrom(
      this.http.post<VehicleContractDto>(
        `${this.backendApi.adminVehicles}/${encodeURIComponent(id)}/restore`,
        {}
      )
    );
  }

  async uploadScan(
    id: string,
    side: RegistrationScanSideContract,
    file: File
  ): Promise<StoredFileContractDto> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return firstValueFrom(
      this.http.put<StoredFileContractDto>(
        `${this.backendApi.adminVehicles}/${encodeURIComponent(id)}/registration-certificate/${side}`,
        formData
      )
    );
  }

  async downloadScanBlob(id: string, side: RegistrationScanSideContract): Promise<Blob> {
    return firstValueFrom(
      this.http.get(
        `${this.backendApi.adminVehicles}/${encodeURIComponent(id)}/registration-certificate/${side}`,
        { responseType: 'blob' }
      )
    );
  }

  async deleteScan(id: string, side: RegistrationScanSideContract): Promise<void> {
    await firstValueFrom(
      this.http.delete(
        `${this.backendApi.adminVehicles}/${encodeURIComponent(id)}/registration-certificate/${side}`
      )
    );
  }
}
