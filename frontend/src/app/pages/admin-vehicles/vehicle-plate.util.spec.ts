import { sanitizeUaPlateInput, UA_PLATE_PATTERN } from './vehicle-plate.util';

describe('vehicle-plate.util', () => {
  it('uppercases and strips spaces/invalid chars', () => {
    expect(sanitizeUaPlateInput('aa 12-34 bb')).toBe('AA1234BB');
    expect(sanitizeUaPlateInput('АА!!1234ВВxyz')).toBe('AA1234BB');
  });

  it('maps cyrillic lookalikes to latin', () => {
    expect(sanitizeUaPlateInput('ка1234нх')).toBe('KA1234HX');
  });

  it('caps length at 8', () => {
    expect(sanitizeUaPlateInput('AA1234BB999')).toBe('AA1234BB');
  });

  it('accepts Latin A–Z including G (as on registration certificates)', () => {
    expect(sanitizeUaPlateInput('bc3027xg')).toBe('BC3027XG');
    expect(UA_PLATE_PATTERN.test('BC3027XG')).toBe(true);
    expect(UA_PLATE_PATTERN.test('DD1234BB')).toBe(true);
  });

  it('matches full plate pattern', () => {
    expect(UA_PLATE_PATTERN.test('AA1234BB')).toBe(true);
    expect(UA_PLATE_PATTERN.test('AA12')).toBe(false);
    expect(UA_PLATE_PATTERN.test('AA1234B')).toBe(false);
    expect(UA_PLATE_PATTERN.test('AA12-34BB')).toBe(false);
  });
});
