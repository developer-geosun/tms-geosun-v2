import { DocumentTypeReferenceContractDto } from '../api/document-types-contracts.model';
import { Language } from '../services/language.service';

/** Локалізована назва виду документа за мовою UI. */
export function documentTypeLocalizedName(
  documentType: Pick<DocumentTypeReferenceContractDto, 'nameUk' | 'nameEn' | 'nameRu'>,
  language: Language
): string {
  switch (language) {
    case 'en':
      return documentType.nameEn;
    case 'ru':
      return documentType.nameRu;
    default:
      return documentType.nameUk;
  }
}
