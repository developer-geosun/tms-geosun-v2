export type VehicleCombinationListViewContract = 'active' | 'all' | 'deleted';

export interface VehicleCombinationContractDto {
  id: string;
  name: string | null;
  tractorId: string;
  tractorPlateNumber: string;
  trailerId: string;
  trailerPlateNumber: string;
  deleted: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVehicleCombinationContractRequest {
  name?: string | null;
  tractorId: string;
  trailerId: string;
}

export type UpdateVehicleCombinationContractRequest = CreateVehicleCombinationContractRequest;
