import { extractApiError } from './api-error';

export function isNbuRateError(error: unknown): boolean {
  const apiError = extractApiError(error);
  if (apiError.code === 'NBU_RATES_NOT_AVAILABLE_FOR_DATE') {
    return true;
  }
  const message = apiError.message?.toLowerCase() ?? '';
  return message.includes('nbu') || message.includes('нбу');
}
