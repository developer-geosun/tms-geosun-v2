import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { BackendApiService } from './backend-api.service';
import { PageResponse } from './page-response.model';
import {
  AdminUserListParams,
  UpdateUserActiveContractRequest,
  UpdateUserRoleContractRequest,
  UserAdminContractDto
} from './users-admin-contracts.model';

@Injectable({ providedIn: 'root' })
export class UsersAdminApiService {
  private readonly http = inject(HttpClient);
  private readonly backendApi = inject(BackendApiService);

  async list(listParams: AdminUserListParams = {}): Promise<PageResponse<UserAdminContractDto>> {
    let params = new HttpParams();
    if (listParams.email?.trim()) {
      params = params.set('email', listParams.email.trim());
    }
    if (listParams.role) {
      params = params.set('role', listParams.role);
    }
    if (listParams.active !== undefined) {
      params = params.set('active', String(listParams.active));
    }
    if (listParams.deleted !== undefined) {
      params = params.set('deleted', String(listParams.deleted));
    }
    params = params.set('sort', listParams.sort ?? 'createdAt');
    params = params.set('order', listParams.order ?? 'desc');
    params = params.set('page', String(listParams.page ?? 0));
    params = params.set('size', String(listParams.size ?? 20));
    return firstValueFrom(
      this.http.get<PageResponse<UserAdminContractDto>>(this.backendApi.adminUsers, { params })
    );
  }

  async getById(id: string): Promise<UserAdminContractDto> {
    return firstValueFrom(
      this.http.get<UserAdminContractDto>(
        `${this.backendApi.adminUsers}/${encodeURIComponent(id)}`
      )
    );
  }

  async updateRole(id: string, payload: UpdateUserRoleContractRequest): Promise<UserAdminContractDto> {
    return firstValueFrom(
      this.http.patch<UserAdminContractDto>(
        `${this.backendApi.adminUsers}/${encodeURIComponent(id)}/role`,
        payload
      )
    );
  }

  async setActive(id: string, payload: UpdateUserActiveContractRequest): Promise<UserAdminContractDto> {
    return firstValueFrom(
      this.http.patch<UserAdminContractDto>(
        `${this.backendApi.adminUsers}/${encodeURIComponent(id)}/active`,
        payload
      )
    );
  }

  async softDelete(id: string): Promise<void> {
    await firstValueFrom(
      this.http.delete(`${this.backendApi.adminUsers}/${encodeURIComponent(id)}`)
    );
  }

  async restore(id: string): Promise<UserAdminContractDto> {
    return firstValueFrom(
      this.http.post<UserAdminContractDto>(
        `${this.backendApi.adminUsers}/${encodeURIComponent(id)}/restore`,
        null
      )
    );
  }
}
