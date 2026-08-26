/** Латинські літери номерного знака UA (після нормалізації з кирилиці). */
const UA_PLATE_LATIN = new Set([
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
  'I',
  'J',
  'K',
  'L',
  'M',
  'N',
  'O',
  'P',
  'Q',
  'R',
  'S',
  'T',
  'U',
  'V',
  'W',
  'X',
  'Y',
  'Z'
]);

/**
 * Кириличні відповідники → латиниця для єдиного зберігання
 * (літери, що графічно збігаються з латиницею + типові замінники).
 */
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
  Х: 'X',
  Д: 'D',
  Л: 'L',
  Ф: 'F',
  У: 'U'
};

/**
 * Формат стандартного номера: 2 літери + 4 цифри + 2 літери (латиниця A–Z).
 * ДСТУ 4278: базовий набір A B C E H I K M O P T X; також трапляються
 * латиниця поза цим набором (напр. Y/Z для EV, G на бланках реєстрації).
 */
export const UA_PLATE_PATTERN = /^[A-Z]{2}\d{4}[A-Z]{2}$/;

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
