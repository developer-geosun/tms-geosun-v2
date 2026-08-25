import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { ConfigService } from './config.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ConfigService, useValue: { apiUrl: 'http://localhost:8080', environment: { apiUrl: 'http://localhost:8080' } } }
      ]
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('saves session after successful login', () => {
    let emittedEmail = '';
    service.login({ email: 'user@example.com', password: 'password123' }).subscribe((user) => {
      emittedEmail = user.email;
    });

    const request = httpMock.expectOne('http://localhost:8080/api/v1/auth/login');
    expect(request.request.method).toBe('POST');
    request.flush({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      tokenType: 'Bearer',
      expiresIn: 900,
      user: {
        id: 'u1',
        email: 'user@example.com',
        role: 'user'
      }
    });

    expect(emittedEmail).toBe('user@example.com');
    expect(service.isAuthenticated()).toBeTrue();
    expect(service.accessToken()).toBe('access-token');
  });

  it('clears session when refresh fails', () => {
    service.login({ email: 'user@example.com', password: 'password123' }).subscribe();
    httpMock.expectOne('http://localhost:8080/api/v1/auth/login').flush({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      tokenType: 'Bearer',
      expiresIn: 900,
      user: {
        id: 'u1',
        email: 'user@example.com',
        role: 'user'
      }
    });

    service.refreshAccessToken().subscribe({
      error: () => undefined
    });
    httpMock.expectOne('http://localhost:8080/api/v1/auth/refresh').flush({ message: 'invalid' }, { status: 401, statusText: 'Unauthorized' });

    expect(service.isAuthenticated()).toBeFalse();
    expect(service.accessToken()).toBeNull();
  });

  it('treats API error envelope as failed login', () => {
    let status = 0;

    service.login({ email: 'user@example.com', password: 'password123' }).subscribe({
      error: (error: { status: number }) => {
        status = error.status;
      }
    });

    httpMock.expectOne('http://localhost:8080/api/v1/auth/login').flush({
      status: 401,
      message: 'Invalid email or password'
    });

    expect(status).toBe(401);
    expect(service.isAuthenticated()).toBeFalse();
  });
});
