import {
  filterDriverPersonNameChars,
  sanitizeDriverPersonNameInput
} from './driver-person-name.util';

describe('driver-person-name.util', () => {
  it('capitalizes the first letter and lowercases the rest', () => {
    expect(sanitizeDriverPersonNameInput('горєліков')).toBe('Горєліков');
    expect(sanitizeDriverPersonNameInput('МАКСИМ')).toBe('Максим');
    expect(sanitizeDriverPersonNameInput('вІкТоРоВиЧ')).toBe('Вікторович');
  });

  it('keeps English letters with the same casing rule', () => {
    expect(sanitizeDriverPersonNameInput('MARY')).toBe('Mary');
    expect(sanitizeDriverPersonNameInput('john')).toBe('John');
  });

  it('capitalizes the first letter after a hyphen', () => {
    expect(sanitizeDriverPersonNameInput('АННА-МАРІЯ')).toBe('Анна-Марія');
    expect(sanitizeDriverPersonNameInput('mary-jane')).toBe('Mary-Jane');
  });

  it('collapses consecutive hyphens into one', () => {
    expect(sanitizeDriverPersonNameInput('коваль--петренко')).toBe('Коваль-Петренко');
    expect(sanitizeDriverPersonNameInput('анна---марія')).toBe('Анна-Марія');
  });

  it('strips digits, spaces and punctuation except hyphen and apostrophe', () => {
    expect(sanitizeDriverPersonNameInput('max123im!')).toBe('Maxim');
    expect(sanitizeDriverPersonNameInput('Гор єліков')).toBe('Горєліков');
  });

  it('keeps Ukrainian apostrophe and normalizes typographic variants', () => {
    expect(sanitizeDriverPersonNameInput("мар'яна")).toBe("Мар'яна");
    expect(sanitizeDriverPersonNameInput('ДЕМ\u2019ЯН')).toBe("Дем'ян");
    expect(sanitizeDriverPersonNameInput('з\u02BCїзд')).toBe("З'їзд");
  });

  it('strips Russian letters that are not in the Ukrainian alphabet', () => {
    expect(filterDriverPersonNameChars('Петровскый')).toBe('Петровскй');
    expect(sanitizeDriverPersonNameInput('Горёликов')).toBe('Горликов');
  });

  it('keeps Ukrainian special letters ґ є і ї', () => {
    expect(sanitizeDriverPersonNameInput('ГАЄВСЬКИЙ')).toBe('Гаєвський');
    expect(sanitizeDriverPersonNameInput('їжак')).toBe('Їжак');
    expect(sanitizeDriverPersonNameInput('ґалаґан')).toBe('Ґалаґан');
  });

  it('returns empty string when nothing allowed remains', () => {
    expect(sanitizeDriverPersonNameInput('123 !@#')).toBe('');
    expect(sanitizeDriverPersonNameInput('')).toBe('');
  });
});
