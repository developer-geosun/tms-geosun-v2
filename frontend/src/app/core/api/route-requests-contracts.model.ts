import { RouteSnapshotContractDto } from './routes-contracts.model';
import { QuoteContractDto } from './quotes-contracts.model';

export type RouteRequestStatusContract =
  | 'new'
  | 'in_review'
  | 'quoted'
  | 'accepted'
  | 'rejected'
  | 'cancelled'
  | 'expired';

export interface CargoDetailsContract {
  type: string | null;
  weightKg: number | null;
  volumeM3: number | null;
}

export interface CreateRouteRequestContractRequest {
  routeId: string;
  preferredStartDate: string | null;
  comment: string | null;
  cargo: CargoDetailsContract | null;
}

export interface CountryDistanceContractDto {
  countryCode: string;
  distanceMeters: number;
  durationSeconds: number | null;
  /** 0 = перша країна на маршруті (якщо поле є у відповіді API). */
  alongRouteOrder?: number | null;
}

export interface RouteRequestContractDto {
  id: number;
  routeId: string;
  status: RouteRequestStatusContract;
  preferredStartDate: string | null;
  comment: string | null;
  /** Email користувача, який створив запит. */
  requesterEmail?: string | null;
  createdAt: string;
  updatedAt: string;
  route: RouteSnapshotContractDto | null;
  countryDistances: CountryDistanceContractDto[];
  currentQuote: QuoteContractDto | null;
}

