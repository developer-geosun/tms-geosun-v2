import { CountryReferenceContractDto } from '../api/country-reference-contracts.model';
import { Language } from '../services/language.service';

/** Назва країни з довідника відповідно до поточної мови інтерфейсу. */
export function countryReferenceLocalizedName(
  country: CountryReferenceContractDto,
  language: Language
): string {
  switch (language) {
    case 'en':
      return country.nameEn;
    case 'ru':
      return country.nameRu;
    default:
      return country.nameUk;
  }
}

/** Підпис для списку: ISO2 і локалізована назва. */
export function countryReferenceSelectLabel(
  country: CountryReferenceContractDto,
  language: Language
): string {
  const code = country.codeAlpha2.toUpperCase();
  return `${code} ${countryReferenceLocalizedName(country, language)}`;
}
