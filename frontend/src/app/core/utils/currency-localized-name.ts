import { CurrencyContractDto } from '../api/currencies-contracts.model';
import { Language } from '../services/language.service';

/** Назва валюти відповідно до мови інтерфейсу; за відсутності перекладу — українська. */
export function currencyLocalizedName(
  currency: Pick<CurrencyContractDto, 'nameUk' | 'nameEn' | 'nameRu'>,
  language: Language
): string {
  switch (language) {
    case 'en':
      return currency.nameEn?.trim() || currency.nameUk;
    case 'ru':
      return currency.nameRu?.trim() || currency.nameUk;
    default:
      return currency.nameUk;
  }
}
