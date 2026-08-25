export type StorageBackendTypeContract = 'local' | 's3';

export interface StorageInfoContractDto {
  type: StorageBackendTypeContract | string;
}

export interface StoredFileContractDto {
  id: string;
  storageKey: string;
  originalFilename: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
  createdByUserId: string | null;
}
