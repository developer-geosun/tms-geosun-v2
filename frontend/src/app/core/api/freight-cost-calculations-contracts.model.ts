import { SeasonModeContract } from './freight-numeric-scenarios-contracts.model';

export interface CountryBreakdownContractRequest {
  scenarioId: string;
}

export interface CostPreviewContractRequest {
  scenarioId: string;
  calculationDate: string;
  seasonOverride?: SeasonModeContract;
  startPoint?: CostPreviewStartPointContract;
}

export interface CostPreviewStartPointContract {
  lat: number;
  lng: number;
  address?: string | null;
}

export interface CostPreviewContractResponse {
  calculationId: string;
  routeRequestId: number;
  scenarioId: string;
  calculationDate: string;
  seasonUsed: string;
  lTotalKm: number;
  lEmptyKm: number;
  lLoadedKm: number;
  directCostUah: number;
  driverCostUah: number;
  costBeforeMarginUah: number;
  marginUah: number;
  totalUah: number;
  totalProposalAmount: number;
  proposalCurrency: string;
  breakdown: unknown;
  calculationSummary: string;
  createdAt: string;
}

export interface FreightCostCalculationContractDto {
  id: string;
  routeRequestId: number;
  scenarioId: string;
  scenarioName: string | null;
  calculationDate: string;
  seasonUsed: string;
  lTotalKm: number;
  lEmptyKm: number;
  lLoadedKm: number;
  directCostUah: number;
  driverCostUah: number;
  costBeforeMarginUah: number;
  marginUah: number;
  totalUah: number;
  totalProposalAmount: number;
  proposalCurrency: string;
  breakdown: unknown;
  calculationSummary: string;
  createdAt: string;
}
