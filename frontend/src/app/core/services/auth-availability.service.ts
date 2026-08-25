import { HttpBackend, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap, timeout } from 'rxjs';
import { NGROK_SKIP_BROWSER_WARNING_HEADERS } from '../http/ngrok-headers';
import { ConfigService } from './config.service';

const AUTH_AVAILABILITY_TIMEOUT_MS = 5000;

interface ActuatorHealthResponse {
  status?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthAvailabilityService {
  private readonly http = new HttpClient(inject(HttpBackend));
  private readonly configService = inject(ConfigService);
  private readonly available = signal(true);

  isAvailable(): boolean {
    return this.available();
  }

  // Одноразова перевірка доступності після завантаження сторінки (через guard)
  checkOnStartup(): Observable<void> {
    return this.checkHealthEndpoint_().pipe(
      timeout(AUTH_AVAILABILITY_TIMEOUT_MS),
      map((response) => this.isHealthyResponse_(response)),
      catchError(() => of(false)),
      tap((isAvailable) => this.available.set(isAvailable)),
      map(() => void 0)
    );
  }

  private isHealthyResponse_(response: unknown): boolean {
    if (!response || typeof response !== 'object') {
      return false;
    }

    return (response as ActuatorHealthResponse).status === 'UP';
  }

  private toBaseUrl(path: string): string {
    return `${this.configService.apiUrl}${path}`;
  }

  private checkHealthEndpoint_(): Observable<ActuatorHealthResponse> {
    // HttpBackend обходить interceptors — заголовок ngrok додаємо явно.
    const options = { headers: NGROK_SKIP_BROWSER_WARNING_HEADERS };
    return this.http
      .get<ActuatorHealthResponse>(this.toBaseUrl('/actuator/health/readiness'), options)
      .pipe(
        catchError((error: unknown) => {
          // Для сумісності з середовищами, де readiness endpoint вимкнений.
          if (error instanceof HttpErrorResponse && error.status === 404) {
            return this.http.get<ActuatorHealthResponse>(this.toBaseUrl('/actuator/health'), options);
          }
          throw error;
        })
      );
  }
}
