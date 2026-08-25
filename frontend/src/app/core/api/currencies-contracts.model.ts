export interface CurrencyContractDto {
  code: string;
  numericCode: number;
  nameUk: string;
  nameEn: string | null;
  nbuUnits: number;
  minorUnits: number;
  isActive: boolean;
  displayOrder: number | null;
  latestNbuRatePerUnit: number | null;
  latestRateDate: string | null;
}

export interface UpdateCurrencyContractRequest {
  isActive: boolean;
  displayOrder?: number | null;
}

export interface NbuRateContractDto {
  currencyCode: string;
  rate: number;
  ratePerUnit: number;
  nbuUnits: number;
  special: string | null;
}

export interface NbuRatesSnapshotContractDto {
  rateDate: string;
  fetchedAt: string;
  rates: NbuRateContractDto[];
}

export interface SyncNbuRatesContractResponse {
  rateDate: string;
  fetchedAt: string;
  syncedCount: number;
  rates: NbuRateContractDto[];
}
