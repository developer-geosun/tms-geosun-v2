import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { BackendApiService } from './backend-api.service';
import { DriversApiService } from './drivers-api.service';

describe('DriversApiService', () => {
  let service: DriversApiService;
  let httpMock: HttpTestingController;
  let backendApi: BackendApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(DriversApiService);
    httpMock = TestBed.inject(HttpTestingController);
    backendApi = TestBed.inject(BackendApiService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('lists drivers with view param', async () => {
    const pending = service.list('deleted');
    const request = httpMock.expectOne(
      (req) =>
        req.url === backendApi.adminDrivers &&
        req.method === 'GET' &&
        req.params.get('view') === 'deleted'
    );
    request.flush([]);
    await expectAsync(pending).toBeResolvedTo([]);
  });

  it('soft-deletes via DELETE', async () => {
    const pending = service.softDelete('drv-1');
    const request = httpMock.expectOne(`${backendApi.adminDrivers}/drv-1`);
    expect(request.request.method).toBe('DELETE');
    request.flush(null);
    await expectAsync(pending).toBeResolved();
  });

  it('restores via POST /restore', async () => {
    const pending = service.restore('drv-1');
    const request = httpMock.expectOne(`${backendApi.adminDrivers}/drv-1/restore`);
    expect(request.request.method).toBe('POST');
    request.flush({ id: 'drv-1', deleted: false });
    await expectAsync(pending).toBeResolvedTo(jasmine.objectContaining({ id: 'drv-1' }));
  });
});
