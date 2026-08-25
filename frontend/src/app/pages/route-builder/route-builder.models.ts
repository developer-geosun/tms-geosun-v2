export type FreightLang = 'uk' | 'ru' | 'en';

export type CountryCode = 'ua' | 'pl' | 'sk' | 'hu' | 'ro' | 'md' | string;

export type RoutePointOperation = 'LOADING' | 'EXPORT_CUSTOMS' | 'IMPORT_CUSTOMS' | 'UNLOADING';

export const ROUTE_POINT_OPERATIONS: readonly RoutePointOperation[] = [
  'LOADING',
  'EXPORT_CUSTOMS',
  'IMPORT_CUSTOMS',
  'UNLOADING'
] as const;

export interface Checkpoint {
  name: Record<FreightLang, string>;
  lat: number;
  lng: number;
}

export interface Waypoint {
  lat: number;
  lng: number;
  address: string;
  country: CountryCode | null;
  isBorder: boolean;
  operations: RoutePointOperation[];
}

export interface RoutePointPayload {
  order: number;
  type: 'start' | 'stop' | 'finish' | 'border';
  address: string;
  lat: number;
  lng: number;
  country: string;
  isBorder: boolean;
  segmentDistanceKmToNext: number | null;
  operations: RoutePointOperation[];
}

export interface FreightRequestPayload {
  clientRequestId: string;
  timestamp: string;
  source: string;
  userAgent: string;
  lang: FreightLang;
  email: string;
  phone: string;
  preferredStartDate: string;
  routeComment: string;
  distanceKm: number;
  points: RoutePointPayload[];
  route: string;
}
