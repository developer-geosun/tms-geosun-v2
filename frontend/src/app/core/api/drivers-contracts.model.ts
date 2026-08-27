import { StoredFileContractDto } from './stored-files-contracts.model';
import { RegistrationScanSideContract } from './vehicles-contracts.model';

export type { RegistrationScanSideContract };

export type DriverListViewContract = 'active' | 'all' | 'deleted';
export type DriverDocumentTypeContract = 'PASSPORT' | 'DRIVER_LICENSE';
export type DriverDocumentStatusContract = 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' | 'MISSING';
export type DriverDocumentComplianceContract = 'OK' | 'ATTENTION' | 'PROBLEM';
export type DriverDocumentsFilterContract = 'all' | 'ok' | 'attention' | 'problem';

export interface DriverContractDto {
  id: string;
  lastName: string;
  firstName: string;
  patronymic: string | null;
  phone: string;
  licenseNumber: string;
  licenseCategories: string;
  licenseExpiresOn: string;
  userId: string | null;
  userEmail: string | null;
  comment: string | null;
  documentCompliance: DriverDocumentComplianceContract;
  deleted: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDriverContractRequest {
  lastName: string;
  firstName: string;
  patronymic?: string | null;
  phone: string;
  licenseNumber: string;
  licenseCategories: string;
  licenseExpiresOn: string;
  comment?: string | null;
}

export type UpdateDriverContractRequest = CreateDriverContractRequest;

export interface LinkableUserContractDto {
  id: string;
  email: string;
  role: string;
}

export interface DriverDocumentVersionContractDto {
  id: string;
  documentType: DriverDocumentTypeContract;
  side: 'FRONT' | 'BACK';
  validFrom: string;
  validTo: string;
  status: DriverDocumentStatusContract;
  file: StoredFileContractDto;
  createdAt: string;
  updatedAt: string;
}

export interface DriverDocumentGroupContractDto {
  documentType: DriverDocumentTypeContract;
  side: 'FRONT' | 'BACK';
  status: DriverDocumentStatusContract;
  current: DriverDocumentVersionContractDto | null;
  history: DriverDocumentVersionContractDto[];
}

export interface DriverDocumentsResponseContract {
  documents: DriverDocumentGroupContractDto[];
}
