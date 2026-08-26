import { StoredFileContractDto } from './stored-files-contracts.model';

export type VehicleTypeContract = 'SEMI_TRACTOR' | 'SEMI_TRAILER';
export type VehicleListViewContract = 'active' | 'all' | 'deleted';
export type RegistrationScanSideContract = 'front' | 'back';

export type VehicleDocumentTypeContract =
  | 'THIRD_PARTY_LIABILITY'
  | 'GREEN_CARD'
  | 'TECHNICAL_INSPECTION'
  | 'WHITE_CERTIFICATE'
  | 'TACHOGRAPH_VERIFICATION'
  | 'REFRIGERATOR_VERIFICATION';

export type VehicleDocumentStatusContract =
  | 'VALID'
  | 'EXPIRING_SOON'
  | 'EXPIRED'
  | 'MISSING';

export type VehicleDocumentComplianceContract = 'OK' | 'ATTENTION' | 'PROBLEM';

export type VehicleDocumentsFilterContract = 'all' | 'ok' | 'attention' | 'problem';

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
  hasRefrigerator: boolean;
  documentCompliance: VehicleDocumentComplianceContract;
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
  hasRefrigerator: boolean;
}

export type UpdateVehicleContractRequest = CreateVehicleContractRequest;

export interface VehicleDocumentVersionContractDto {
  id: string;
  documentType: VehicleDocumentTypeContract;
  validFrom: string;
  validTo: string;
  status: VehicleDocumentStatusContract;
  scan: StoredFileContractDto;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleDocumentGroupContractDto {
  documentType: VehicleDocumentTypeContract;
  required: boolean;
  status: VehicleDocumentStatusContract;
  current: VehicleDocumentVersionContractDto | null;
  history: VehicleDocumentVersionContractDto[];
}

export interface VehicleDocumentsResponseContract {
  documents: VehicleDocumentGroupContractDto[];
}
