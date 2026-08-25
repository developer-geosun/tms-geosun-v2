import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  const routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: {
            accessToken: () => 'access-token',
            refreshAccessToken: () => of('new-access-token'),
            clearSession: jasmine.createSpy('clearSession')
          }
        },
        { provide: Router, useValue: routerSpy }
      ]
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('adds bearer token to outgoing request', () => {
    http.get('/data').subscribe();
    const request = httpMock.expectOne('/data');
    expect(request.request.headers.get('Authorization')).toBe('Bearer access-token');
    request.flush({ ok: true });
  });

  it('clears session and redirects when refresh fails', () => {
    const authService = TestBed.inject(AuthService) as unknown as {
      refreshAccessToken: () => ReturnType<typeof throwError>;
      clearSession: jasmine.Spy;
    };
    authService.refreshAccessToken = () =>
      throwError(() => new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' }));

    http.get('/secure').subscribe({
      error: () => undefined
    });
    const request = httpMock.expectOne('/secure');
    request.flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(authService.clearSession).toHaveBeenCalled();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
  });
});
