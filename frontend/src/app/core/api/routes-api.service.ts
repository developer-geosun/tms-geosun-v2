import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { BackendApiService } from './backend-api.service';
import {
  RouteSnapshotContractDto,
  RouteSummaryContractDto,
  SaveRouteContractRequest
} from './routes-contracts.model';

@Injectable({ providedIn: 'root' })
export class RoutesApiService {
  private readonly http = inject(HttpClient);
  private readonly backendApi = inject(BackendApiService);

  async saveRoute(payload: SaveRouteContractRequest): Promise<RouteSnapshotContractDto> {
    return firstValueFrom(this.http.post<RouteSnapshotContractDto>(this.backendApi.routes, payload));
  }

  async updateMyRoute(routeId: string, payload: SaveRouteContractRequest): Promise<RouteSnapshotContractDto> {
    return firstValueFrom(
      this.http.put<RouteSnapshotContractDto>(
        `${this.backendApi.myRoutes}/${encodeURIComponent(routeId)}`,
        payload
      )
    );
  }

  async getMyRoutes(view: 'active' | 'all' | 'deleted' = 'active'): Promise<RouteSummaryContractDto[]> {
    const params = new HttpParams().set('view', view);
    return firstValueFrom(
      this.http.get<RouteSummaryContractDto[]>(this.backendApi.myRoutes, { params })
    );
  }

  async duplicateMyRoute(routeId: string): Promise<RouteSnapshotContractDto> {
    return firstValueFrom(
      this.http.post<RouteSnapshotContractDto>(
        `${this.backendApi.myRoutes}/${encodeURIComponent(routeId)}/duplicate`,
        null
      )
    );
  }

  async restoreMyRoute(routeId: string): Promise<RouteSnapshotContractDto> {
    return firstValueFrom(
      this.http.post<RouteSnapshotContractDto>(
        `${this.backendApi.myRoutes}/${encodeURIComponent(routeId)}/restore`,
        null
      )
    );
  }

  async getMyRouteById(routeId: string): Promise<RouteSnapshotContractDto> {
    return firstValueFrom(this.http.get<RouteSnapshotContractDto>(`${this.backendApi.myRoutes}/${encodeURIComponent(routeId)}`));
  }

  async deleteMyRoute(routeId: string): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${this.backendApi.myRoutes}/${encodeURIComponent(routeId)}`));
  }
}

