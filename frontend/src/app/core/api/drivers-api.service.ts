import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { BackendApiService } from './backend-api.service';
import {
  CreateDriverContractRequest,
  DriverContractDto,
  DriverDocumentTypeContract,
  DriverDocumentVersionContractDto,
  DriverDocumentsResponseContract,
  DriverListViewContract,
  LinkableUserContractDto,
  RegistrationScanSideContract,
  UpdateDriverContractRequest
} from './drivers-contracts.model';

@Injectable({ providedIn: 'root' })
export class DriversApiService {
  private readonly http = inject(HttpClient);
  private readonly backendApi = inject(BackendApiService);

  async list(view: DriverListViewContract = 'active'): Promise<DriverContractDto[]> {
    const params = new HttpParams().set('view', view);
    return firstValueFrom(
      this.http.get<DriverContractDto[]>(this.backendApi.adminDrivers, { params })
    );
  }

  async getById(id: string): Promise<DriverContractDto> {
    return firstValueFrom(
      this.http.get<DriverContractDto>(`${this.backendApi.adminDrivers}/${encodeURIComponent(id)}`)
    );
  }

  async create(payload: CreateDriverContractRequest): Promise<DriverContractDto> {
    return firstValueFrom(
      this.http.post<DriverContractDto>(this.backendApi.adminDrivers, payload)
    );
  }

  async update(id: string, payload: UpdateDriverContractRequest): Promise<DriverContractDto> {
    return firstValueFrom(
      this.http.put<DriverContractDto>(
        `${this.backendApi.adminDrivers}/${encodeURIComponent(id)}`,
        payload
      )
    );
  }

  async softDelete(id: string): Promise<void> {
    await firstValueFrom(
      this.http.delete(`${this.backendApi.adminDrivers}/${encodeURIComponent(id)}`)
    );
  }

  async restore(id: string): Promise<DriverContractDto> {
    return firstValueFrom(
      this.http.post<DriverContractDto>(
        `${this.backendApi.adminDrivers}/${encodeURIComponent(id)}/restore`,
        {}
      )
    );
  }

  async findLinkableUser(email: string): Promise<LinkableUserContractDto> {
    const params = new HttpParams().set('email', email);
    return firstValueFrom(
      this.http.get<LinkableUserContractDto>(`${this.backendApi.adminDrivers}/linkable-users`, {
        params
      })
    );
  }

  async linkUser(id: string, userId: string): Promise<DriverContractDto> {
    return firstValueFrom(
      this.http.put<DriverContractDto>(
        `${this.backendApi.adminDrivers}/${encodeURIComponent(id)}/user`,
        { userId }
      )
    );
  }

  async unlinkUser(id: string): Promise<DriverContractDto> {
    return firstValueFrom(
      this.http.delete<DriverContractDto>(
        `${this.backendApi.adminDrivers}/${encodeURIComponent(id)}/user`
      )
    );
  }

  async listDocuments(id: string): Promise<DriverDocumentsResponseContract> {
    return firstValueFrom(
      this.http.get<DriverDocumentsResponseContract>(
        `${this.backendApi.adminDrivers}/${encodeURIComponent(id)}/documents`
      )
    );
  }

  async addDocument(
    id: string,
    type: DriverDocumentTypeContract,
    side: RegistrationScanSideContract,
    validFrom: string,
    validTo: string,
    file: File
  ): Promise<DriverDocumentVersionContractDto> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    formData.append('validFrom', validFrom);
    formData.append('validTo', validTo);
    const typePath = type.toLowerCase().replaceAll('_', '-');
    return firstValueFrom(
      this.http.post<DriverDocumentVersionContractDto>(
        `${this.backendApi.adminDrivers}/${encodeURIComponent(id)}/documents/${typePath}/${side}`,
        formData
      )
    );
  }

  async downloadDocumentBlob(id: string, documentId: string): Promise<Blob> {
    return firstValueFrom(
      this.http.get(
        `${this.backendApi.adminDrivers}/${encodeURIComponent(id)}/documents/${encodeURIComponent(documentId)}/file`,
        { responseType: 'blob' }
      )
    );
  }

  async deleteDocument(id: string, documentId: string): Promise<void> {
    await firstValueFrom(
      this.http.delete(
        `${this.backendApi.adminDrivers}/${encodeURIComponent(id)}/documents/${encodeURIComponent(documentId)}`
      )
    );
  }
}
