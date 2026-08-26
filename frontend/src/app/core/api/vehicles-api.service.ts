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
  VehicleDocumentTypeContract,
  VehicleDocumentVersionContractDto,
  VehicleDocumentsResponseContract,
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

  async listDocuments(id: string): Promise<VehicleDocumentsResponseContract> {
    return firstValueFrom(
      this.http.get<VehicleDocumentsResponseContract>(
        `${this.backendApi.adminVehicles}/${encodeURIComponent(id)}/documents`
      )
    );
  }

  async addDocument(
    id: string,
    type: VehicleDocumentTypeContract,
    validFrom: string,
    validTo: string,
    file: File
  ): Promise<VehicleDocumentVersionContractDto> {
    const formData = new FormData();
    formData.append('validFrom', validFrom);
    formData.append('validTo', validTo);
    formData.append('file', file, file.name);
    return firstValueFrom(
      this.http.post<VehicleDocumentVersionContractDto>(
        `${this.backendApi.adminVehicles}/${encodeURIComponent(id)}/documents/${type}`,
        formData
      )
    );
  }

  async patchDocument(
    id: string,
    documentId: string,
    options: { validFrom?: string; validTo?: string; file?: File }
  ): Promise<VehicleDocumentVersionContractDto> {
    const formData = new FormData();
    if (options.validFrom) {
      formData.append('validFrom', options.validFrom);
    }
    if (options.validTo) {
      formData.append('validTo', options.validTo);
    }
    if (options.file) {
      formData.append('file', options.file, options.file.name);
    }
    return firstValueFrom(
      this.http.patch<VehicleDocumentVersionContractDto>(
        `${this.backendApi.adminVehicles}/${encodeURIComponent(id)}/documents/${encodeURIComponent(documentId)}`,
        formData
      )
    );
  }

  async downloadDocumentScanBlob(id: string, documentId: string): Promise<Blob> {
    return firstValueFrom(
      this.http.get(
        `${this.backendApi.adminVehicles}/${encodeURIComponent(id)}/documents/${encodeURIComponent(documentId)}/scan`,
        { responseType: 'blob' }
      )
    );
  }

  async deleteDocument(id: string, documentId: string): Promise<void> {
    await firstValueFrom(
      this.http.delete(
        `${this.backendApi.adminVehicles}/${encodeURIComponent(id)}/documents/${encodeURIComponent(documentId)}`
      )
    );
  }
}
