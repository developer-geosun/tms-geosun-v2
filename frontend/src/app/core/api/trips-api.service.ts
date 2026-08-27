import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { BackendApiService } from './backend-api.service';
import {
  CreateTripContractRequest,
  TripContractDto,
  TripExpenseLineInputContract,
  TripExpenseReportContractDto,
  TripListViewContract,
  TripPageResponse,
  TripStatusContract,
  UpdateTripContractRequest
} from './trips-contracts.model';

@Injectable({ providedIn: 'root' })
export class TripsApiService {
  private readonly http = inject(HttpClient);
  private readonly backendApi = inject(BackendApiService);

  async listAdmin(options: {
    view?: TripListViewContract;
    status?: TripStatusContract;
    driverId?: string;
    plannedFrom?: string;
    plannedTo?: string;
    page?: number;
    size?: number;
  } = {}): Promise<TripPageResponse> {
    let params = new HttpParams()
      .set('view', options.view ?? 'active')
      .set('page', String(options.page ?? 0))
      .set('size', String(options.size ?? 20));
    if (options.status) {
      params = params.set('status', options.status);
    }
    if (options.driverId) {
      params = params.set('driverId', options.driverId);
    }
    if (options.plannedFrom) {
      params = params.set('plannedFrom', options.plannedFrom);
    }
    if (options.plannedTo) {
      params = params.set('plannedTo', options.plannedTo);
    }
    return firstValueFrom(
      this.http.get<TripPageResponse>(this.backendApi.adminTrips, { params })
    );
  }

  async getAdmin(id: string): Promise<TripContractDto> {
    return firstValueFrom(
      this.http.get<TripContractDto>(`${this.backendApi.adminTrips}/${encodeURIComponent(id)}`)
    );
  }

  async create(payload: CreateTripContractRequest): Promise<TripContractDto> {
    return firstValueFrom(
      this.http.post<TripContractDto>(this.backendApi.adminTrips, payload)
    );
  }

  async update(id: string, payload: UpdateTripContractRequest): Promise<TripContractDto> {
    return firstValueFrom(
      this.http.put<TripContractDto>(
        `${this.backendApi.adminTrips}/${encodeURIComponent(id)}`,
        payload
      )
    );
  }

  async updateStatus(id: string, status: TripStatusContract): Promise<TripContractDto> {
    return firstValueFrom(
      this.http.patch<TripContractDto>(
        `${this.backendApi.adminTrips}/${encodeURIComponent(id)}/status`,
        { status }
      )
    );
  }

  async softDelete(id: string): Promise<void> {
    await firstValueFrom(
      this.http.delete(`${this.backendApi.adminTrips}/${encodeURIComponent(id)}`)
    );
  }

  async restore(id: string): Promise<TripContractDto> {
    return firstValueFrom(
      this.http.post<TripContractDto>(
        `${this.backendApi.adminTrips}/${encodeURIComponent(id)}/restore`,
        {}
      )
    );
  }

  async listMy(page = 0, size = 20): Promise<TripPageResponse> {
    const params = new HttpParams().set('page', String(page)).set('size', String(size));
    return firstValueFrom(this.http.get<TripPageResponse>(this.backendApi.myTrips, { params }));
  }

  async getMy(id: string): Promise<TripContractDto> {
    return firstValueFrom(
      this.http.get<TripContractDto>(`${this.backendApi.myTrips}/${encodeURIComponent(id)}`)
    );
  }

  async getExpenseReportAdmin(tripId: string): Promise<TripExpenseReportContractDto> {
    return firstValueFrom(
      this.http.get<TripExpenseReportContractDto>(
        `${this.backendApi.adminTrips}/${encodeURIComponent(tripId)}/expense-report`
      )
    );
  }

  async getExpenseReportMy(tripId: string): Promise<TripExpenseReportContractDto> {
    return firstValueFrom(
      this.http.get<TripExpenseReportContractDto>(
        `${this.backendApi.myTrips}/${encodeURIComponent(tripId)}/expense-report`
      )
    );
  }

  async replaceExpenseLinesAdmin(
    tripId: string,
    lines: TripExpenseLineInputContract[]
  ): Promise<TripExpenseReportContractDto> {
    return firstValueFrom(
      this.http.put<TripExpenseReportContractDto>(
        `${this.backendApi.adminTrips}/${encodeURIComponent(tripId)}/expense-report/lines`,
        { lines }
      )
    );
  }

  async replaceExpenseLinesMy(
    tripId: string,
    lines: TripExpenseLineInputContract[]
  ): Promise<TripExpenseReportContractDto> {
    return firstValueFrom(
      this.http.put<TripExpenseReportContractDto>(
        `${this.backendApi.myTrips}/${encodeURIComponent(tripId)}/expense-report/lines`,
        { lines }
      )
    );
  }

  async uploadReceiptAdmin(tripId: string, lineId: string, file: File): Promise<TripExpenseReportContractDto> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return firstValueFrom(
      this.http.put<TripExpenseReportContractDto>(
        `${this.backendApi.adminTrips}/${encodeURIComponent(tripId)}/expense-report/lines/${encodeURIComponent(lineId)}/receipt`,
        formData
      )
    );
  }

  async uploadReceiptMy(tripId: string, lineId: string, file: File): Promise<TripExpenseReportContractDto> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return firstValueFrom(
      this.http.put<TripExpenseReportContractDto>(
        `${this.backendApi.myTrips}/${encodeURIComponent(tripId)}/expense-report/lines/${encodeURIComponent(lineId)}/receipt`,
        formData
      )
    );
  }

  async deleteReceiptAdmin(tripId: string, lineId: string): Promise<TripExpenseReportContractDto> {
    return firstValueFrom(
      this.http.delete<TripExpenseReportContractDto>(
        `${this.backendApi.adminTrips}/${encodeURIComponent(tripId)}/expense-report/lines/${encodeURIComponent(lineId)}/receipt`
      )
    );
  }

  async deleteReceiptMy(tripId: string, lineId: string): Promise<TripExpenseReportContractDto> {
    return firstValueFrom(
      this.http.delete<TripExpenseReportContractDto>(
        `${this.backendApi.myTrips}/${encodeURIComponent(tripId)}/expense-report/lines/${encodeURIComponent(lineId)}/receipt`
      )
    );
  }

  async submitExpenseAdmin(tripId: string): Promise<TripExpenseReportContractDto> {
    return firstValueFrom(
      this.http.post<TripExpenseReportContractDto>(
        `${this.backendApi.adminTrips}/${encodeURIComponent(tripId)}/expense-report/submit`,
        {}
      )
    );
  }

  async submitExpenseMy(tripId: string): Promise<TripExpenseReportContractDto> {
    return firstValueFrom(
      this.http.post<TripExpenseReportContractDto>(
        `${this.backendApi.myTrips}/${encodeURIComponent(tripId)}/expense-report/submit`,
        {}
      )
    );
  }

  async reviewExpense(
    tripId: string,
    approved: boolean,
    reviewComment?: string
  ): Promise<TripExpenseReportContractDto> {
    return firstValueFrom(
      this.http.post<TripExpenseReportContractDto>(
        `${this.backendApi.adminTrips}/${encodeURIComponent(tripId)}/expense-report/review`,
        { approved, reviewComment: reviewComment ?? null }
      )
    );
  }

  async reopenExpense(tripId: string): Promise<TripExpenseReportContractDto> {
    return firstValueFrom(
      this.http.post<TripExpenseReportContractDto>(
        `${this.backendApi.adminTrips}/${encodeURIComponent(tripId)}/expense-report/reopen`,
        {}
      )
    );
  }
}
