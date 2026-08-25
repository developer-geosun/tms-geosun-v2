export type TollTypeContract = 'EUR_PER_KM' | 'EUR_PER_DAY';

export interface TollTariffSetContractDto {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CountryTollRuleContractDto {
  id: string;
  tollTariffSetId: string;
  countryCode: string;
  tollType: TollTypeContract;
  rate: number;
  fixedDays: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTollTariffSetContractRequest {
  name: string;
  description?: string | null;
  isActive?: boolean;
}

export interface UpdateTollTariffSetContractRequest {
  name: string;
  description?: string | null;
  isActive: boolean;
}

export interface CreateCountryTollRuleContractRequest {
  countryCode: string;
  tollType: TollTypeContract;
  rate: number;
  fixedDays?: number | null;
  isActive?: boolean;
}

export interface UpdateCountryTollRuleContractRequest {
  tollType: TollTypeContract;
  rate: number;
  fixedDays?: number | null;
  countryCode?: string;
  isActive: boolean;
}
