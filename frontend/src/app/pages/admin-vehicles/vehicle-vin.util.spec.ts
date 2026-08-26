import { sanitizeVinInput, VIN_PATTERN } from './vehicle-vin.util';

describe('vehicle-vin.util', () => {
  it('uppercases and strips spaces/invalid chars including I O Q', () => {
    expect(sanitizeVinInput('wvw zzz1jzy w000001')).toBe('WVWZZZ1JZYW000001');
    expect(sanitizeVinInput('ABCIOQ12345678901')).toBe('ABC12345678901');
  });

  it('caps length at 17', () => {
    expect(sanitizeVinInput('WVWZZZ1JZYW000001EXTRA')).toBe('WVWZZZ1JZYW000001');
  });

  it('matches full vin pattern', () => {
    expect(VIN_PATTERN.test('WVWZZZ1JZYW000001')).toBe(true);
    expect(VIN_PATTERN.test('WVWZZZ1JZYW00000')).toBe(false);
    expect(VIN_PATTERN.test('WVWZZZ1IZYW000001')).toBe(false);
  });
});
