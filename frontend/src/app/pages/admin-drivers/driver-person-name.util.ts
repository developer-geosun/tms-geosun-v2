/** Латиниця (ENG) для прізвища, імені та по батькові. */
const PERSON_NAME_LATIN = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

/** Українська абетка (без російських Ё/Ъ/Ы/Э). */
const PERSON_NAME_UKRAINIAN =
  'АБВГҐДЕЄЖЗИІЇЙКЛМНОПРСТУФХЦЧШЩЬЮЯабвгґдеєжзиіїйклмнопрстуфхцчшщьюя';

/**
 * Варіанти апострофа з клавіатури та типографіки
 * (ASCII, U+2018, U+2019, U+02BC, U+02B9).
 */
const APOSTROPHE_VARIANTS = new Set(["'", '\u2018', '\u2019', '\u02BC', '\u02B9']);

/** Єдиний апостроф для збереження. */
const CANONICAL_APOSTROPHE = "'";

const PERSON_NAME_ALLOWED = new Set([
  ...PERSON_NAME_LATIN,
  ...PERSON_NAME_UKRAINIAN,
  '-',
  CANONICAL_APOSTROPHE
]);

const PERSON_NAME_LETTERS = new Set([...PERSON_NAME_LATIN, ...PERSON_NAME_UKRAINIAN]);

/** Залишає лише літери UKR/ENG, один дефіс підряд і апостроф. */
export function filterDriverPersonNameChars(raw: string): string {
  let result = '';
  for (const ch of raw) {
    const mapped = APOSTROPHE_VARIANTS.has(ch) ? CANONICAL_APOSTROPHE : ch;
    if (!PERSON_NAME_ALLOWED.has(mapped)) {
      continue;
    }
    if (mapped === '-' && result.endsWith('-')) {
      continue;
    }
    result += mapped;
  }
  return result;
}

/**
 * При вводі ПІБ: зайві символи відкидаються; перша літера кожного сегмента
 * (початок рядка та після дефіса) — верхній регістр, решта — нижній
 * (локаль uk для І/Ї/Є/Ґ).
 */
export function sanitizeDriverPersonNameInput(raw: string): string {
  const filtered = filterDriverPersonNameChars(raw);
  if (!filtered) {
    return '';
  }
  let result = '';
  let capitalizeNext = true;
  for (const ch of filtered) {
    if (ch === '-') {
      result += ch;
      capitalizeNext = true;
      continue;
    }
    if (PERSON_NAME_LETTERS.has(ch)) {
      result += capitalizeNext
        ? ch.toLocaleUpperCase('uk')
        : ch.toLocaleLowerCase('uk');
      capitalizeNext = false;
      continue;
    }
    result += ch;
  }
  return result;
}
