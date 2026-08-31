import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import {
  Observable,
  catchError,
  finalize,
  map,
  of,
  shareReplay,
  switchMap,
  tap,
  throwError,
  timeout
} from 'rxjs';
import { ConfigService } from './config.service';
import {
  AuthState,
  AuthUser,
  ForgotPasswordRequest,
  LoginRequest,
  LoginResponse,
  OperationSuccessResponse,
  PasswordResetInfoRequest,
  PasswordResetInfoResponse,
  RefreshResponse,
  RegisterRequest,
  RegisterResponse,
  ResetPasswordRequest,
  VerifyEmailRequest,
  UserRole
} from '../../shared/models';

const AUTH_STORAGE_KEY = 'tms_geosun_auth';
const SESSION_BOOTSTRAP_TIMEOUT_MS = 20000;
const ACCESS_TOKEN_EXPIRY_SKEW_SECONDS = 30;

/** Помилка, яка означає відхилення сесії сервером (не таймаут і не офлайн). */
export function isSessionRejected(error: unknown): boolean {
  return error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403);
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly configService = inject(ConfigService);

  private readonly state = signal<AuthState>(this.loadInitialState());
  private readonly sessionRestoredSignal = signal(false);
  private sessionEpoch = 0;
  private readonly sessionRestoredPromise: Promise<void>;
  private resolveSessionRestored!: () => void;

  readonly user = computed(() => this.state().user);
  readonly accessToken = computed(() => this.state().accessToken);
  readonly isAuthenticated = computed(() => Boolean(this.state().accessToken && this.state().user));
  readonly sessionRestored = computed(() => this.sessionRestoredSignal());
  readonly roles = computed<UserRole[]>(() => {
    const role = this.state().user?.role;
    return role ? [role] : [];
  });

  private refreshInFlight$: Observable<string> | null = null;

  constructor() {
    this.sessionRestoredPromise = new Promise((resolve) => {
      this.resolveSessionRestored = resolve;
    });
    this.bindCrossTabSync_();
  }

  whenSessionRestored(): Promise<void> {
    return this.sessionRestoredPromise;
  }

  login(payload: LoginRequest): Observable<AuthUser> {
    return this.http.post<LoginResponse | ApiErrorEnvelope>(this.toApiUrl('/auth/login'), payload).pipe(
      map((response) => this.ensureSuccessResponse_(response)),
      tap((response) =>
        this.setSession(response.accessToken, response.refreshToken, this.normalizeUser_(response.user))
      ),
      map((response) => this.normalizeUser_(response.user))
    );
  }

  register(payload: RegisterRequest): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse | ApiErrorEnvelope>(this.toApiUrl('/auth/register'), payload).pipe(
      map((response) => this.ensureSuccessResponse_(response)),
      map((response) => ({ ...response, role: normalizeRole_(response.role) }))
    );
  }

  verifyEmail(payload: VerifyEmailRequest): Observable<OperationSuccessResponse> {
    return this.http
      .post<OperationSuccessResponse | ApiErrorEnvelope>(this.toApiUrl('/auth/verify-email'), payload)
      .pipe(map((response) => this.ensureSuccessResponse_(response)));
  }

  forgotPassword(payload: ForgotPasswordRequest): Observable<OperationSuccessResponse> {
    return this.http
      .post<OperationSuccessResponse | ApiErrorEnvelope>(this.toApiUrl('/auth/forgot-password'), payload)
      .pipe(map((response) => this.ensureSuccessResponse_(response)));
  }

  getPasswordResetInfo(payload: PasswordResetInfoRequest): Observable<PasswordResetInfoResponse> {
    return this.http
      .post<PasswordResetInfoResponse | ApiErrorEnvelope>(this.toApiUrl('/auth/reset-password-info'), payload)
      .pipe(map((response) => this.ensureSuccessResponse_(response)));
  }

  resetPassword(payload: ResetPasswordRequest): Observable<OperationSuccessResponse> {
    return this.http
      .post<OperationSuccessResponse | ApiErrorEnvelope>(this.toApiUrl('/auth/reset-password'), payload)
      .pipe(map((response) => this.ensureSuccessResponse_(response)));
  }

  logout(): Observable<void> {
    const accessToken = this.state().accessToken;
    if (!accessToken) {
      this.clearSession();
      return of(void 0);
    }

    return this.http.post<void | ApiErrorEnvelope>(this.toApiUrl('/auth/logout'), null).pipe(
      map((response) => this.ensureSuccessResponse_(response)),
      catchError(() => of(void 0)),
      tap(() => this.clearSession())
    );
  }

  getMe(): Observable<AuthUser> {
    return this.http.get<AuthUser | ApiErrorEnvelope>(this.toApiUrl('/auth/me')).pipe(
      map((response) => this.ensureSuccessResponse_(response)),
      map((user) => this.normalizeUser_(user)),
      tap((user) => this.setUser(user))
    );
  }

  /**
   * Перевіряє збережену сесію під час старту застосунку.
   * Сесію очищаємо лише при явній відмові сервера (401/403).
   */
  verifySessionOnStartup(): Observable<void> {
    const { accessToken, refreshToken } = this.state();
    if (!accessToken && !refreshToken) {
      return this.markRestored_();
    }

    const bootstrap$ =
      accessToken && !this.isAccessTokenExpired_()
        ? this.getMe()
        : this.refreshAccessToken().pipe(switchMap(() => this.getMe()));

    return bootstrap$.pipe(
      timeout(SESSION_BOOTSTRAP_TIMEOUT_MS),
      map(() => void 0),
      catchError((error: unknown) => {
        if (isSessionRejected(error)) {
          this.clearSession();
        }
        return of(void 0);
      }),
      finalize(() => {
        this.markRestored_();
      })
    );
  }

  hasAnyRole(allowedRoles: readonly UserRole[]): boolean {
    if (!allowedRoles.length) {
      return true;
    }

    const currentRoles = this.roles();
    return allowedRoles.some((role) => currentRoles.includes(role));
  }

  refreshAccessToken(): Observable<string> {
    const refreshToken = this.state().refreshToken;
    if (!refreshToken) {
      return throwError(() => new Error('Refresh token is missing'));
    }

    if (this.refreshInFlight$) {
      return this.refreshInFlight$;
    }

    const epoch = this.sessionEpoch;
    this.refreshInFlight$ = this.http
      .post<RefreshResponse | ApiErrorEnvelope>(this.toApiUrl('/auth/refresh'), { refreshToken })
      .pipe(
        map((response) => this.ensureSuccessResponse_(response)),
        tap((response) => {
          // Сесію вже скинули, поки запит був у дорозі — пізню відповідь не застосовуємо
          if (epoch !== this.sessionEpoch) {
            return;
          }
          this.setSession(response.accessToken, response.refreshToken, this.normalizeUser_(response.user));
        }),
        map((response) => response.accessToken),
        catchError((error) => {
          if (isSessionRejected(error)) {
            this.clearSession();
          }
          return throwError(() => error);
        }),
        finalize(() => {
          this.refreshInFlight$ = null;
        }),
        shareReplay({ refCount: false, bufferSize: 1 })
      );

    return this.refreshInFlight$;
  }

  clearSession(): void {
    this.sessionEpoch += 1;
    this.state.set({ accessToken: null, refreshToken: null, user: null });
    this.persistState();
  }

  private setSession(accessToken: string, refreshToken: string, user: AuthUser): void {
    this.state.set({ accessToken, refreshToken, user });
    this.persistState();
  }

  private setUser(user: AuthUser): void {
    this.state.update((current) => ({ ...current, user }));
    this.persistState();
  }

  private markRestored_(): Observable<void> {
    if (!this.sessionRestoredSignal()) {
      this.sessionRestoredSignal.set(true);
      this.resolveSessionRestored();
    }
    return of(void 0);
  }

  private toApiUrl(path: string): string {
    return `${this.configService.apiUrl}/api/v1${path}`;
  }

  private isAccessTokenExpired_(): boolean {
    const token = this.state().accessToken;
    if (!token) {
      return true;
    }

    const payload = decodeJwtPayload_(token);
    if (!payload || typeof payload.exp !== 'number') {
      return false;
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    return payload.exp <= nowSeconds + ACCESS_TOKEN_EXPIRY_SKEW_SECONDS;
  }

  private bindCrossTabSync_(): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.addEventListener('storage', (event) => {
      if (event.key !== AUTH_STORAGE_KEY) {
        return;
      }
      this.state.set(this.loadInitialState());
    });
  }

  private loadInitialState(): AuthState {
    if (typeof window === 'undefined') {
      return { accessToken: null, refreshToken: null, user: null };
    }

    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return { accessToken: null, refreshToken: null, user: null };
    }

    try {
      const parsed = JSON.parse(raw) as AuthState;
      return {
        accessToken: parsed.accessToken ?? null,
        refreshToken: parsed.refreshToken ?? null,
        user: parsed.user ?? null
      };
    } catch {
      return { accessToken: null, refreshToken: null, user: null };
    }
  }

  private persistState(): void {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(this.state()));
  }

  private ensureSuccessResponse_<T>(response: T | ApiErrorEnvelope): T {
    if (isApiErrorEnvelope_(response)) {
      throw new HttpErrorResponse({
        status: response.status,
        statusText: response.message,
        error: response
      });
    }
    return response;
  }

  private normalizeUser_(user: AuthUser): AuthUser {
    const normalizedRole = normalizeRole_(user.role);
    return { ...user, role: normalizedRole };
  }
}

interface ApiErrorEnvelope {
  status: number;
  message: string;
}

interface JwtPayload {
  exp?: number;
}

function decodeJwtPayload_(token: string): JwtPayload | null {
  const parts = token.split('.');
  if (parts.length < 2) {
    return null;
  }

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const json = atob(padded);
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

function isApiErrorEnvelope_(value: unknown): value is ApiErrorEnvelope {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as { status?: unknown; message?: unknown };
  return typeof candidate.status === 'number' && typeof candidate.message === 'string';
}

function normalizeRole_(role: string): UserRole {
  const normalized = role.trim().toLowerCase();
  if (normalized === 'admin' || normalized === 'manager' || normalized === 'driver' || normalized === 'user') {
    return normalized;
  }
  return 'user';
}
