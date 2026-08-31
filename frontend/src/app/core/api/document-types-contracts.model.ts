export type DocumentTypeListViewContract = 'active' | 'all' | 'deleted';

export interface DocumentTypeFieldDefinitionContractDto {
  key: string;
  nameUk: string;
  nameEn: string;
  nameRu: string;
}

export interface DocumentTypeReferenceContractDto {
  id: string;
  nameUk: string;
  nameEn: string;
  nameRu: string;
  countryCode: string;
  plannedScanPages: number;
  fieldDefinitions: DocumentTypeFieldDefinitionContractDto[];
  deleted: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDocumentTypeContractRequest {
  nameUk: string;
  nameEn: string;
  nameRu: string;
  countryCode: string;
  plannedScanPages: number;
  fieldDefinitions: DocumentTypeFieldDefinitionContractDto[];
}

export type UpdateDocumentTypeContractRequest = CreateDocumentTypeContractRequest;
