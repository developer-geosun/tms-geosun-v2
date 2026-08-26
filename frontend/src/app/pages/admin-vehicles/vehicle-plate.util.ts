/** Літери стандартного UA-номера (латиниця; кирилиця мапиться сюди). */
const UA_PLATE_LATIN = new Set(['A', 'B', 'C', 'E', 'H', 'I', 'K', 'M', 'O', 'P', 'T', 'X']);

/** Кириличні відповідники → латиниця для єдиного зберігання. */
const UA_PLATE_CYRILLIC_TO_LATIN: Readonly<Record<string, string>> = {
  А: 'A',
  В: 'B',
  Е: 'E',
  І: 'I',
  К: 'K',
  М: 'M',
  Н: 'H',
  О: 'O',
  Р: 'P',
  С: 'C',
  Т: 'T',
  Х: 'X'
};

/** Повний стандартний номер: 2 літери + 4 цифри + 2 літери. */
export const UA_PLATE_PATTERN = /^[ABCEHIKMOPTX]{2}\d{4}[ABCEHIKMOPTX]{2}$/;

export const UA_PLATE_MAX_LENGTH = 8;

/**
 * При вводі: UPPERCASE, пробіли/зайві символи відкидаються,
 * кирилиця → латиниця, довжина не більше 8.
 */
export function sanitizeUaPlateInput(raw: string): string {
  let result = '';
  for (const ch of raw) {
    const upper = ch.toUpperCase();
    const mapped = UA_PLATE_CYRILLIC_TO_LATIN[upper] ?? upper;
    if (UA_PLATE_LATIN.has(mapped) || (mapped >= '0' && mapped <= '9')) {
      result += mapped;
      if (result.length >= UA_PLATE_MAX_LENGTH) {
        break;
      }
    }
  }
  return result;
}
