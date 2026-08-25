import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { BackendApiService } from './backend-api.service';
import { CountryReferenceContractDto } from './country-reference-contracts.model';

@Injectable({ providedIn: 'root' })
export class CountryReferenceApiService {
  private readonly http = inject(HttpClient);
  private readonly backendApi = inject(BackendApiService);

  async list(search?: string): Promise<CountryReferenceContractDto[]> {
    let params = new HttpParams();
    if (search?.trim()) {
      params = params.set('search', search.trim());
    }
    return firstValueFrom(
      this.http.get<CountryReferenceContractDto[]>(this.backendApi.adminCountryReference, { params })
    );
  }

  async getByCode(codeAlpha2: string): Promise<CountryReferenceContractDto> {
    return firstValueFrom(
      this.http.get<CountryReferenceContractDto>(
        `${this.backendApi.adminCountryReference}/${encodeURIComponent(codeAlpha2)}`
      )
    );
  }
}
