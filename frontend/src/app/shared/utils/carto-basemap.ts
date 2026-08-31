import * as L from 'leaflet';

/** Шаблон URL raster-підкладки CARTO Voyager (Leaflet). */
export const CARTO_VOYAGER_TILE_TEMPLATE =
  'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png';

/** Атрибуція, обов’язкова за умовами безкоштовного ключа CARTO. */
export const CARTO_BASEMAP_ATTRIBUTION =
  '&copy; GeoSun | &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attributions">CARTO</a>';

/**
 * URL тайлів Voyager. Без параметра `key` CARTO віддає тайли з водяним знаком «API KEY REQUIRED».
 * Офіційний параметр — `key`, не `api_key` (див. https://docs.carto.com/faqs/carto-basemaps).
 */
export function cartoVoyagerTileUrl(apiKey: string): string {
  const key = apiKey.trim();
  if (!key) {
    return CARTO_VOYAGER_TILE_TEMPLATE;
  }
  return `${CARTO_VOYAGER_TILE_TEMPLATE}?key=${encodeURIComponent(key)}`;
}

/** Додає підкладку CARTO Voyager на карту Leaflet. */
export function addCartoVoyagerBasemap(map: L.Map, apiKey: string): L.TileLayer {
  return L.tileLayer(cartoVoyagerTileUrl(apiKey), {
    attribution: CARTO_BASEMAP_ATTRIBUTION,
    subdomains: 'abcd',
    maxZoom: 20
  }).addTo(map);
}
