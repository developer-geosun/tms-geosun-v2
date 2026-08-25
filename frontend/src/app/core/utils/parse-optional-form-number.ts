/**
 * Парсить опційне число з reactive form: для `input type="number"` Angular (`NumberValueAccessor`)
 * передає модель як `number | null`, а не рядок — виклик `.trim()` на числі падає.
 */
export function parseOptionalFormNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  const normalized = String(value).trim();
  if (!normalized) {
    return null;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}
