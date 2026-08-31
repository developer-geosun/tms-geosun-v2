import { CARTO_VOYAGER_TILE_TEMPLATE, cartoVoyagerTileUrl } from './carto-basemap';

describe('cartoVoyagerTileUrl', () => {
  it('returns the template without a key', () => {
    expect(cartoVoyagerTileUrl('')).toBe(CARTO_VOYAGER_TILE_TEMPLATE);
    expect(cartoVoyagerTileUrl('   ')).toBe(CARTO_VOYAGER_TILE_TEMPLATE);
  });

  it('appends key query parameter', () => {
    expect(cartoVoyagerTileUrl('cb1_test')).toBe(
      `${CARTO_VOYAGER_TILE_TEMPLATE}?key=cb1_test`
    );
  });
});
