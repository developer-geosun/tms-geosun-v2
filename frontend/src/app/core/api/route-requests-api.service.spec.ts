import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { BackendApiService } from './backend-api.service';
import { RouteRequestsApiService } from './route-requests-api.service';

describe('RouteRequestsApiService', () => {
  let service: RouteRequestsApiService;
  let httpMock: HttpTestingController;
  let backendApi: BackendApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });

    service = TestBed.inject(RouteRequestsApiService);
    httpMock = TestBed.inject(HttpTestingController);
    backendApi = TestBed.inject(BackendApiService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('creates route request via POST /route-requests', async () => {
    const payload = { routeId: 'r1' };
    const pending = service.createRouteRequest(payload as never);

    const request = httpMock.expectOne(backendApi.routeRequests);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    request.flush({ id: 'req-1' });

    await expectAsync(pending).toBeResolvedTo(jasmine.objectContaining({ id: 'req-1' }));
  });

  it('applies query params for paginated admin list', async () => {
    const pending = service.getAdminRouteRequests({ status: 'NEW', page: 1, size: 10 });

    const request = httpMock.expectOne(
      (r) =>
        r.url === backendApi.adminRouteRequests &&
        r.params.get('status') === 'NEW' &&
        r.params.get('page') === '1' &&
        r.params.get('size') === '10'
    );
    expect(request.request.method).toBe('GET');
    request.flush({ content: [], totalElements: 0, totalPages: 0, page: 1, size: 10 });

    await expectAsync(pending).toBeResolvedTo(
      jasmine.objectContaining({ content: [], totalElements: 0, totalPages: 0, page: 1, size: 10 })
    );
  });

  it('sends idempotency key header for createAdminQuote', async () => {
    const pending = service.createAdminQuote(1, {} as never, ' key-1 ');

    const request = httpMock.expectOne(`${backendApi.adminRouteRequests}/1/quotes`);
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('Idempotency-Key')).toBe('key-1');
    request.flush({ id: 'q1' });

    await expectAsync(pending).toBeResolvedTo(jasmine.objectContaining({ id: 'q1' }));
  });

  it('sends idempotency key header for sendAdminQuote', async () => {
    const pending = service.sendAdminQuote('quote/1', ' send-1 ');

    const request = httpMock.expectOne(`${backendApi.adminQuotes}/quote%2F1/send`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toBeNull();
    expect(request.request.headers.get('Idempotency-Key')).toBe('send-1');
    request.flush({ id: 'quote/1', status: 'SENT' });

    await expectAsync(pending).toBeResolvedTo(jasmine.objectContaining({ id: 'quote/1', status: 'SENT' }));
  });

  it('posts cost preview with optional startPoint', async () => {
    const pending = service.postCostPreview(42, {
      scenarioId: 'scenario-1',
      calculationDate: '2026-07-08',
      startPoint: {
        lat: 50.45,
        lng: 30.52,
        address: 'Kyiv'
      }
    });

    const request = httpMock.expectOne(backendApi.adminRouteRequestCostPreview(42));
    expect(request.request.method).toBe('POST');
    expect(request.request.body.startPoint).toEqual({
      lat: 50.45,
      lng: 30.52,
      address: 'Kyiv'
    });
    request.flush({ calculationId: 'calc-1' });

    await expectAsync(pending).toBeResolvedTo(jasmine.objectContaining({ calculationId: 'calc-1' }));
  });

  it('posts cost preview without startPoint when not provided', async () => {
    const pending = service.postCostPreview(42, {
      scenarioId: 'scenario-1',
      calculationDate: '2026-07-08'
    });

    const request = httpMock.expectOne(backendApi.adminRouteRequestCostPreview(42));
    expect(request.request.method).toBe('POST');
    expect(request.request.body.startPoint).toBeUndefined();
    request.flush({ calculationId: 'calc-2' });

    await expectAsync(pending).toBeResolvedTo(jasmine.objectContaining({ calculationId: 'calc-2' }));
  });
});
