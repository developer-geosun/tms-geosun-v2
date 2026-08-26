/** Дозволені символи VIN (ISO 3779): без I, O, Q. */
const VIN_ALLOWED = new Set([
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
  'J',
  'K',
  'L',
  'M',
  'N',
  'P',
  'R',
  'S',
  'T',
  'U',
  'V',
  'W',
  'X',
  'Y',
  'Z',
  '0',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9'
]);

/** Повний VIN: рівно 17 дозволених символів. */
export const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/;

export const VIN_MAX_LENGTH = 17;

/**
 * При вводі: UPPERCASE, пробіли/I/O/Q/зайві символи відкидаються, довжина ≤ 17.
 */
export function sanitizeVinInput(raw: string): string {
  let result = '';
  for (const ch of raw) {
    const upper = ch.toUpperCase();
    if (VIN_ALLOWED.has(upper)) {
      result += upper;
      if (result.length >= VIN_MAX_LENGTH) {
        break;
      }
    }
  }
  return result;
}
