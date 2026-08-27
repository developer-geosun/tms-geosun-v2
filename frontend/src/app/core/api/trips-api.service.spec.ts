import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { BackendApiService } from './backend-api.service';
import { TripsApiService } from './trips-api.service';

describe('TripsApiService', () => {
  let service: TripsApiService;
  let httpMock: HttpTestingController;
  let backendApi: BackendApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(TripsApiService);
    httpMock = TestBed.inject(HttpTestingController);
    backendApi = TestBed.inject(BackendApiService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('lists admin trips with filters', async () => {
    const pending = service.listAdmin({ status: 'PLANNED', page: 0, size: 10 });
    const request = httpMock.expectOne(
      (req) =>
        req.url === backendApi.adminTrips &&
        req.method === 'GET' &&
        req.params.get('status') === 'PLANNED' &&
        req.params.get('size') === '10'
    );
    request.flush({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 10 });
    const result = await pending;
    expect(result.totalElements).toBe(0);
    expect(result.page).toBe(0);
    expect(result.size).toBe(10);
  });

  it('updates status via PATCH', async () => {
    const pending = service.updateStatus('trip-1', 'IN_PROGRESS');
    const request = httpMock.expectOne(`${backendApi.adminTrips}/trip-1/status`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ status: 'IN_PROGRESS' });
    request.flush({ id: 'trip-1', status: 'IN_PROGRESS' });
    const result = await pending;
    expect(result.status).toBe('IN_PROGRESS');
  });

  it('lists my trips', async () => {
    const pending = service.listMy(0, 20);
    const request = httpMock.expectOne(
      (req) => req.url === backendApi.myTrips && req.method === 'GET'
    );
    request.flush({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 20 });
    const result = await pending;
    expect(result.size).toBe(20);
  });
});
