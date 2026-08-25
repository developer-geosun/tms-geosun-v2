import { HttpErrorResponse } from '@angular/common/http';

export interface ApiErrorPayload {
  code: string | null;
  message: string | null;
  status: number | null;
}

export function extractApiError(error: unknown): ApiErrorPayload {
  if (!(error instanceof HttpErrorResponse)) {
    return { code: null, message: null, status: null };
  }

  const payload = error.error;
  if (typeof payload === 'string' && payload.trim().length > 0) {
    return { code: null, message: payload.trim(), status: error.status };
  }

  if (!payload || typeof payload !== 'object') {
    return { code: null, message: null, status: error.status };
  }

  const record = payload as Record<string, unknown>;
  const code = typeof record['code'] === 'string' ? record['code'] : null;
  const candidateKeys = ['message', 'error', 'detail', 'title'] as const;
  let message: string | null = null;
  for (const key of candidateKeys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      message = value.trim();
      break;
    }
  }

  return { code, message, status: error.status };
}
