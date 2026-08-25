import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { BackendApiService } from './backend-api.service';
import { RoutesApiService } from './routes-api.service';

describe('RoutesApiService', () => {
  let service: RoutesApiService;
  let httpMock: HttpTestingController;
  let backendApi: BackendApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });

    service = TestBed.inject(RoutesApiService);
    httpMock = TestBed.inject(HttpTestingController);
    backendApi = TestBed.inject(BackendApiService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('saves route via POST /routes', async () => {
    const payload = {
      title: 'Kyiv - Warsaw',
      routingProfile: 'truck',
      routingMode: 'fast',
      routePolyline: 'polyline',
      distanceKm: 812.3,
      durationMin: 742,
      routeComment: null,
      points: [],
      hereRouteMeta: null
    };

    const pending = service.saveRoute(payload);
    const request = httpMock.expectOne(backendApi.routes);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    request.flush({ id: 'route-1' });

    await expectAsync(pending).toBeResolvedTo(jasmine.objectContaining({ id: 'route-1' }));
  });

  it('loads my routes via GET /routes/my?view=active by default', async () => {
    const pending = service.getMyRoutes();
    const request = httpMock.expectOne(
      (req) => req.url === backendApi.myRoutes && req.method === 'GET' && req.params.get('view') === 'active'
    );
    request.flush([{ id: 'route-1', title: 'A' }]);

    await expectAsync(pending).toBeResolvedTo([jasmine.objectContaining({ id: 'route-1' })]);
  });

  it('loads deleted routes with view=deleted', async () => {
    const pending = service.getMyRoutes('deleted');
    const request = httpMock.expectOne(
      (req) => req.url === backendApi.myRoutes && req.params.get('view') === 'deleted'
    );
    request.flush([]);
    await expectAsync(pending).toBeResolvedTo([]);
  });

  it('encodes routeId for GET /routes/my/{id}', async () => {
    const pending = service.getMyRouteById('route/with spaces');
    const request = httpMock.expectOne(`${backendApi.myRoutes}/route%2Fwith%20spaces`);
    expect(request.request.method).toBe('GET');
    request.flush({ id: 'route/with spaces' });

    await expectAsync(pending).toBeResolvedTo(jasmine.objectContaining({ id: 'route/with spaces' }));
  });

  it('updates route via PUT /routes/my/{id}', async () => {
    const payload = {
      title: 'Updated title',
      routingProfile: 'truck',
      routingMode: 'fast',
      routePolyline: 'polyline',
      distanceKm: 812.3,
      durationMin: 742,
      routeComment: null,
      points: [],
      hereRouteMeta: null
    };

    const pending = service.updateMyRoute('42', payload);
    const request = httpMock.expectOne(`${backendApi.myRoutes}/42`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(payload);
    request.flush({ id: '42', title: 'Updated title' });

    await expectAsync(pending).toBeResolvedTo(jasmine.objectContaining({ id: '42' }));
  });
});
