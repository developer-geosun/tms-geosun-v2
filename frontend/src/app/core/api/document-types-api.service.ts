import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { BackendApiService } from './backend-api.service';
import {
  CreateDocumentTypeContractRequest,
  DocumentTypeListViewContract,
  DocumentTypeReferenceContractDto,
  UpdateDocumentTypeContractRequest
} from './document-types-contracts.model';

@Injectable({ providedIn: 'root' })
export class DocumentTypesApiService {
  private readonly http = inject(HttpClient);
  private readonly backendApi = inject(BackendApiService);

  async list(
    view: DocumentTypeListViewContract = 'active',
    search?: string,
    country?: string
  ): Promise<DocumentTypeReferenceContractDto[]> {
    let params = new HttpParams().set('view', view);
    if (search?.trim()) {
      params = params.set('search', search.trim());
    }
    if (country?.trim()) {
      params = params.set('country', country.trim().toUpperCase());
    }
    return firstValueFrom(
      this.http.get<DocumentTypeReferenceContractDto[]>(this.backendApi.adminDocumentTypes, {
        params
      })
    );
  }

  async getById(id: string): Promise<DocumentTypeReferenceContractDto> {
    return firstValueFrom(
      this.http.get<DocumentTypeReferenceContractDto>(
        `${this.backendApi.adminDocumentTypes}/${encodeURIComponent(id)}`
      )
    );
  }

  async create(
    payload: CreateDocumentTypeContractRequest
  ): Promise<DocumentTypeReferenceContractDto> {
    return firstValueFrom(
      this.http.post<DocumentTypeReferenceContractDto>(
        this.backendApi.adminDocumentTypes,
        payload
      )
    );
  }

  async update(
    id: string,
    payload: UpdateDocumentTypeContractRequest
  ): Promise<DocumentTypeReferenceContractDto> {
    return firstValueFrom(
      this.http.put<DocumentTypeReferenceContractDto>(
        `${this.backendApi.adminDocumentTypes}/${encodeURIComponent(id)}`,
        payload
      )
    );
  }

  async softDelete(id: string): Promise<void> {
    await firstValueFrom(
      this.http.delete(`${this.backendApi.adminDocumentTypes}/${encodeURIComponent(id)}`)
    );
  }

  async restore(id: string): Promise<DocumentTypeReferenceContractDto> {
    return firstValueFrom(
      this.http.post<DocumentTypeReferenceContractDto>(
        `${this.backendApi.adminDocumentTypes}/${encodeURIComponent(id)}/restore`,
        null
      )
    );
  }
}
