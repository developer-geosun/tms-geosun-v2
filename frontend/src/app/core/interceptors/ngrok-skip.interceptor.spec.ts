import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ngrokSkipInterceptor } from './ngrok-skip.interceptor';

describe('ngrokSkipInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([ngrokSkipInterceptor])), provideHttpClientTesting()]
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('adds ngrok-skip-browser-warning header', () => {
    http.get('/api/v1/auth/me').subscribe();

    const request = httpMock.expectOne('/api/v1/auth/me');
    expect(request.request.headers.get('ngrok-skip-browser-warning')).toBe('true');
    request.flush({});
  });
});
