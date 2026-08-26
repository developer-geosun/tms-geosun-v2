import { StoredFileContractDto } from './stored-files-contracts.model';

export type VehicleTypeContract = 'SEMI_TRACTOR' | 'SEMI_TRAILER';
export type VehicleListViewContract = 'active' | 'all' | 'deleted';
export type RegistrationScanSideContract = 'front' | 'back';

export interface VehicleContractDto {
  id: string;
  plateNumber: string;
  vin: string;
  make: string;
  model: string;
  manufactureYear: number;
  owner: string;
  registrationSeries: string;
  registrationNumber: string;
  vehicleType: VehicleTypeContract;
  deleted: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  scanFront: StoredFileContractDto | null;
  scanBack: StoredFileContractDto | null;
}

export interface CreateVehicleContractRequest {
  plateNumber: string;
  vin: string;
  make: string;
  model: string;
  manufactureYear: number;
  owner: string;
  registrationSeries: string;
  registrationNumber: string;
  vehicleType: VehicleTypeContract;
}

export type UpdateVehicleContractRequest = CreateVehicleContractRequest;
