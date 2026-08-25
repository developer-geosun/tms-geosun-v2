export type SeasonModeContract = 'WINTER' | 'NON_WINTER' | 'AUTO';

export type MarginTypeContract = 'PERCENT_OF_COST_BEFORE_MARGIN' | 'FIXED_PER_TRIP';

export interface FreightNumericScenarioContractDto {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  fuelConsumptionEmptyLPer100km: number;
  fuelConsumptionLoadedNonWinterLPer100km: number;
  fuelConsumptionLoadedWinterLPer100km: number;
  seasonMode: SeasonModeContract;
  fuelPricePerLiter: number;
  driverSalaryPercentOfFreight: number;
  perDiemAmountPerDay: number;
  perDiemRouteDivisorKm: number;
  perDiemFixedExtraDays: number;
  marginType: MarginTypeContract;
  marginPercent: number | null;
  marginFixedAmount: number | null;
  proposalCurrency: string;
  tollTariffSetId: string;
  tollTariffSetName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFreightNumericScenarioContractRequest {
  name: string;
  description?: string | null;
  isActive?: boolean;
  fuelConsumptionEmptyLPer100km: number;
  fuelConsumptionLoadedNonWinterLPer100km: number;
  fuelConsumptionLoadedWinterLPer100km: number;
  seasonMode: SeasonModeContract;
  fuelPricePerLiter: number;
  driverSalaryPercentOfFreight: number;
  perDiemAmountPerDay: number;
  perDiemRouteDivisorKm: number;
  perDiemFixedExtraDays: number;
  marginType: MarginTypeContract;
  marginPercent?: number | null;
  marginFixedAmount?: number | null;
  proposalCurrency: string;
  tollTariffSetId: string;
}

export type UpdateFreightNumericScenarioContractRequest = CreateFreightNumericScenarioContractRequest;
