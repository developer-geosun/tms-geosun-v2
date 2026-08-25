import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { BackendApiService } from './backend-api.service';
import {
  StorageInfoContractDto,
  StoredFileContractDto
} from './stored-files-contracts.model';

@Injectable({ providedIn: 'root' })
export class StoredFilesApiService {
  private readonly http = inject(HttpClient);
  private readonly backendApi = inject(BackendApiService);

  async storageInfo(): Promise<StorageInfoContractDto> {
    return firstValueFrom(
      this.http.get<StorageInfoContractDto>(`${this.backendApi.adminStoredFiles}/storage-info`)
    );
  }

  async list(): Promise<StoredFileContractDto[]> {
    return firstValueFrom(
      this.http.get<StoredFileContractDto[]>(this.backendApi.adminStoredFiles)
    );
  }

  async upload(file: File): Promise<StoredFileContractDto> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return firstValueFrom(
      this.http.post<StoredFileContractDto>(this.backendApi.adminStoredFiles, formData)
    );
  }

  async downloadBlob(id: string): Promise<Blob> {
    return firstValueFrom(
      this.http.get(`${this.backendApi.adminStoredFiles}/${encodeURIComponent(id)}`, {
        responseType: 'blob'
      })
    );
  }

  async delete(id: string): Promise<void> {
    await firstValueFrom(
      this.http.delete(`${this.backendApi.adminStoredFiles}/${encodeURIComponent(id)}`)
    );
  }
}
