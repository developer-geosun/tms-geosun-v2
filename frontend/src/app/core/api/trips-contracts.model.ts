import { StoredFileContractDto } from './stored-files-contracts.model';
import { PageResponse } from './page-response.model';

export type TripStatusContract =
  | 'DRAFT'
  | 'PLANNED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export type TripListViewContract = 'active' | 'all' | 'deleted';

export type TripExpenseReportStatusContract = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

export type TripExpenseCategoryContract =
  | 'FUEL'
  | 'TOLL'
  | 'PER_DIEM'
  | 'PARKING'
  | 'REPAIR'
  | 'OTHER';

export interface TripContractDto {
  id: string;
  tripNumber: string;
  status: TripStatusContract;
  routeRequestId: number | null;
  title: string | null;
  comment: string | null;
  originText: string | null;
  destinationText: string | null;
  plannedStartAt: string | null;
  plannedEndAt: string | null;
  actualStartAt: string | null;
  actualEndAt: string | null;
  driverId: string | null;
  driverName: string | null;
  combinationId: string | null;
  tractorId: string | null;
  tractorPlate: string | null;
  trailerId: string | null;
  trailerPlate: string | null;
  expenseReportStatus: string | null;
  deleted: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTripContractRequest {
  routeRequestId?: number | null;
  title?: string | null;
  comment?: string | null;
  originText?: string | null;
  destinationText?: string | null;
  plannedStartAt?: string | null;
  plannedEndAt?: string | null;
  driverId?: string | null;
  combinationId?: string | null;
  tractorId?: string | null;
  trailerId?: string | null;
}

export type UpdateTripContractRequest = CreateTripContractRequest;

export interface TripExpenseLineContractDto {
  id: string;
  category: TripExpenseCategoryContract;
  amount: number;
  currencyCode: string;
  expenseDate: string;
  description: string | null;
  storedFileId: string | null;
  receipt: StoredFileContractDto | null;
  sortOrder: number;
}

export interface TripExpenseReportContractDto {
  id: string;
  tripId: string;
  status: TripExpenseReportStatusContract;
  submittedAt: string | null;
  submittedByUserId: string | null;
  reviewedAt: string | null;
  reviewedByUserId: string | null;
  reviewComment: string | null;
  lines: TripExpenseLineContractDto[];
  createdAt: string;
  updatedAt: string;
}

export interface TripExpenseLineInputContract {
  id?: string | null;
  category: TripExpenseCategoryContract;
  amount: number;
  currencyCode: string;
  expenseDate: string;
  description?: string | null;
}

export type TripPageResponse = PageResponse<TripContractDto>;
