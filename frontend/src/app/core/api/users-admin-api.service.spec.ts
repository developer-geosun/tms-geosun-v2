import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { BackendApiService } from './backend-api.service';
import { UsersAdminApiService } from './users-admin-api.service';

describe('UsersAdminApiService', () => {
  let service: UsersAdminApiService;
  let httpMock: HttpTestingController;
  let backendApi: BackendApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });

    service = TestBed.inject(UsersAdminApiService);
    httpMock = TestBed.inject(HttpTestingController);
    backendApi = TestBed.inject(BackendApiService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('lists users via GET /admin/users with filters', async () => {
    const pending = service.list({
      email: 'a@',
      role: 'USER',
      active: true,
      deleted: false,
      page: 1,
      size: 10,
      sort: 'email',
      order: 'asc'
    });
    const request = httpMock.expectOne(
      (req) =>
        req.url === backendApi.adminUsers &&
        req.method === 'GET' &&
        req.params.get('email') === 'a@' &&
        req.params.get('role') === 'USER' &&
        req.params.get('active') === 'true' &&
        req.params.get('deleted') === 'false' &&
        req.params.get('page') === '1' &&
        req.params.get('size') === '10'
    );
    request.flush({ content: [], totalElements: 0, totalPages: 0, page: 1, size: 10 });
    await expectAsync(pending).toBeResolvedTo(
      jasmine.objectContaining({ totalElements: 0, page: 1 })
    );
  });

  it('updates role via PATCH /admin/users/{id}/role', async () => {
    const pending = service.updateRole('user-1', { role: 'MANAGER' });
    const request = httpMock.expectOne(`${backendApi.adminUsers}/user-1/role`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ role: 'MANAGER' });
    request.flush({
      id: 'user-1',
      email: 'a@example.com',
      role: 'MANAGER',
      active: true,
      deleted: false,
      emailVerified: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      deletedAt: null
    });
    await expectAsync(pending).toBeResolvedTo(jasmine.objectContaining({ role: 'MANAGER' }));
  });

  it('soft-deletes via DELETE /admin/users/{id}', async () => {
    const pending = service.softDelete('user/with spaces');
    const request = httpMock.expectOne(`${backendApi.adminUsers}/user%2Fwith%20spaces`);
    expect(request.request.method).toBe('DELETE');
    request.flush(null);
    await expectAsync(pending).toBeResolved();
  });

  it('restores via POST /admin/users/{id}/restore', async () => {
    const pending = service.restore('user-2');
    const request = httpMock.expectOne(`${backendApi.adminUsers}/user-2/restore`);
    expect(request.request.method).toBe('POST');
    request.flush({
      id: 'user-2',
      email: 'b@example.com',
      role: 'USER',
      active: true,
      deleted: false,
      emailVerified: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-02T00:00:00Z',
      deletedAt: null
    });
    await expectAsync(pending).toBeResolvedTo(
      jasmine.objectContaining({ id: 'user-2', deleted: false, active: true })
    );
  });
});
