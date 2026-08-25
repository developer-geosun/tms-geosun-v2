import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { BackendApiService } from './backend-api.service';
import { CreateRouteRequestContractRequest, RouteRequestContractDto } from './route-requests-contracts.model';
import {
  CreateQuoteContractRequest,
  QuoteContractDto,
  SendQuoteContractRequest
} from './quotes-contracts.model';
import { PageResponse } from './page-response.model';
import {
  CostPreviewContractRequest,
  CostPreviewContractResponse,
  CountryBreakdownContractRequest,
  FreightCostCalculationContractDto
} from './freight-cost-calculations-contracts.model';

export interface AdminRouteRequestListParams {
  status?: string;
  createdFrom?: string;
  createdTo?: string;
  ownerEmail?: string;
  routeTitle?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  page?: number;
  size?: number;
}

@Injectable({ providedIn: 'root' })
export class RouteRequestsApiService {
  private readonly http = inject(HttpClient);
  private readonly backendApi = inject(BackendApiService);

  async createRouteRequest(payload: CreateRouteRequestContractRequest): Promise<RouteRequestContractDto> {
    return firstValueFrom(this.http.post<RouteRequestContractDto>(this.backendApi.routeRequests, payload));
  }

  async getMyRouteRequests(): Promise<RouteRequestContractDto[]> {
    return firstValueFrom(this.http.get<RouteRequestContractDto[]>(this.backendApi.myRouteRequests));
  }

  async getMyRouteRequestById(requestId: number): Promise<RouteRequestContractDto> {
    return firstValueFrom(
      this.http.get<RouteRequestContractDto>(`${this.backendApi.myRouteRequests}/${encodeURIComponent(String(requestId))}`)
    );
  }

  async getAdminRouteRequests(
    listParams: AdminRouteRequestListParams = {}
  ): Promise<PageResponse<RouteRequestContractDto>> {
    let params = new HttpParams();
    if (listParams.status) {
      params = params.set('status', listParams.status);
    }
    if (listParams.createdFrom) {
      params = params.set('createdFrom', listParams.createdFrom);
    }
    if (listParams.createdTo) {
      params = params.set('createdTo', listParams.createdTo);
    }
    if (listParams.ownerEmail?.trim()) {
      params = params.set('ownerEmail', listParams.ownerEmail.trim());
    }
    if (listParams.routeTitle?.trim()) {
      params = params.set('routeTitle', listParams.routeTitle.trim());
    }
    params = params.set('sort', listParams.sort ?? 'createdAt');
    params = params.set('order', listParams.order ?? 'desc');
    params = params.set('page', String(listParams.page ?? 0));
    params = params.set('size', String(listParams.size ?? 20));
    return firstValueFrom(
      this.http.get<PageResponse<RouteRequestContractDto>>(this.backendApi.adminRouteRequests, { params })
    );
  }

  async getAdminRouteRequestOwnerEmails(): Promise<string[]> {
    return firstValueFrom(this.http.get<string[]>(`${this.backendApi.adminRouteRequests}/owner-emails`));
  }

  async getAdminRouteRequestById(requestId: number): Promise<RouteRequestContractDto> {
    return firstValueFrom(
      this.http.get<RouteRequestContractDto>(`${this.backendApi.adminRouteRequests}/${encodeURIComponent(String(requestId))}`)
    );
  }

  async createAdminQuote(
    requestId: number,
    payload: CreateQuoteContractRequest,
    idempotencyKey: string
  ): Promise<QuoteContractDto> {
    return firstValueFrom(
      this.http.post<QuoteContractDto>(
        `${this.backendApi.adminRouteRequests}/${encodeURIComponent(String(requestId))}/quotes`,
        payload,
        { headers: this.idempotencyHeaders(idempotencyKey) }
      )
    );
  }

  async sendAdminQuote(
    quoteId: string,
    idempotencyKey: string,
    payload?: SendQuoteContractRequest
  ): Promise<QuoteContractDto> {
    return firstValueFrom(
      this.http.post<QuoteContractDto>(
        `${this.backendApi.adminQuotes}/${encodeURIComponent(quoteId)}/send`,
        payload ?? null,
        { headers: this.idempotencyHeaders(idempotencyKey) }
      )
    );
  }

  async getAdminQuotesHistory(requestId: number): Promise<QuoteContractDto[]> {
    return firstValueFrom(
      this.http.get<QuoteContractDto[]>(
        `${this.backendApi.adminRouteRequests}/${encodeURIComponent(String(requestId))}/quotes`
      )
    );
  }

  async postAdminCountryBreakdown(
    requestId: number,
    body?: CountryBreakdownContractRequest
  ): Promise<RouteRequestContractDto> {
    return firstValueFrom(
      this.http.post<RouteRequestContractDto>(
        `${this.backendApi.adminRouteRequests}/${encodeURIComponent(String(requestId))}/country-breakdown`,
        body ?? null
      )
    );
  }

  async postCostPreview(
    requestId: number,
    payload: CostPreviewContractRequest
  ): Promise<CostPreviewContractResponse> {
    return firstValueFrom(
      this.http.post<CostPreviewContractResponse>(this.backendApi.adminRouteRequestCostPreview(requestId), payload)
    );
  }

  async listCostCalculations(requestId: number): Promise<FreightCostCalculationContractDto[]> {
    return firstValueFrom(
      this.http.get<FreightCostCalculationContractDto[]>(
        this.backendApi.adminRouteRequestCostCalculations(requestId)
      )
    );
  }

  async getCostCalculationById(
    requestId: number,
    calculationId: string
  ): Promise<FreightCostCalculationContractDto> {
    return firstValueFrom(
      this.http.get<FreightCostCalculationContractDto>(
        `${this.backendApi.adminRouteRequestCostCalculations(requestId)}/${encodeURIComponent(calculationId)}`
      )
    );
  }

  async deleteCostCalculation(requestId: number, calculationId: string): Promise<void> {
    await firstValueFrom(
      this.http.delete<void>(
        `${this.backendApi.adminRouteRequestCostCalculations(requestId)}/${encodeURIComponent(calculationId)}`
      )
    );
  }

  private idempotencyHeaders(idempotencyKey: string): HttpHeaders {
    return new HttpHeaders({ 'Idempotency-Key': idempotencyKey.trim() });
  }
}
