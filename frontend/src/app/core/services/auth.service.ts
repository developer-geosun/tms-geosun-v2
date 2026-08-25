import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, map, of, shareReplay, tap, throwError, timeout } from 'rxjs';
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
const SESSION_VERIFY_TIMEOUT_MS = 5000;

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly configService = inject(ConfigService);

  private readonly state = signal<AuthState>(this.loadInitialState());
  readonly user = computed(() => this.state().user);
  readonly accessToken = computed(() => this.state().accessToken);
  readonly isAuthenticated = computed(() => Boolean(this.state().accessToken && this.state().user));
  readonly roles = computed<UserRole[]>(() => {
    const role = this.state().user?.role;
    return role ? [role] : [];
  });

  private refreshInFlight$: Observable<string> | null = null;

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
   * Якщо токена немає — нічого не робимо. Якщо токен є, але сервер
   * повертає помилку (401 після невдалого refresh) — очищаємо сесію,
   * щоб UI не показував меню за протухлим токеном.
   */
  verifySessionOnStartup(): Observable<void> {
    if (!this.state().accessToken) {
      return of(void 0);
    }

    return this.getMe().pipe(
      timeout(SESSION_VERIFY_TIMEOUT_MS),
      map(() => void 0),
      catchError(() => {
        this.clearSession();
        return of(void 0);
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

    this.refreshInFlight$ = this.http.post<RefreshResponse | ApiErrorEnvelope>(this.toApiUrl('/auth/refresh'), { refreshToken }).pipe(
      map((response) => this.ensureSuccessResponse_(response)),
      tap((response) =>
        this.setSession(response.accessToken, response.refreshToken, this.normalizeUser_(response.user))
      ),
      map((response) => response.accessToken),
      catchError((error) => {
        this.clearSession();
        return throwError(() => error);
      }),
      finalize(() => {
        this.refreshInFlight$ = null;
      }),
      shareReplay({ refCount: false, bufferSize: 1 })
    );

    return this.refreshInFlight$;
  }

  private setSession(accessToken: string, refreshToken: string, user: AuthUser): void {
    this.state.set({ accessToken, refreshToken, user });
    this.persistState();
  }

  private setUser(user: AuthUser): void {
    this.state.update((current) => ({ ...current, user }));
    this.persistState();
  }

  private setAccessToken(accessToken: string): void {
    this.state.update((current) => ({ ...current, accessToken }));
    this.persistState();
  }

  clearSession(): void {
    this.state.set({ accessToken: null, refreshToken: null, user: null });
    this.persistState();
  }

  private toApiUrl(path: string): string {
    return `${this.configService.apiUrl}/api/v1${path}`;
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

function isApiErrorEnvelope_(value: unknown): value is ApiErrorEnvelope {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as { status?: unknown; message?: unknown };
  return typeof candidate.status === 'number' && typeof candidate.message === 'string';
}

function normalizeRole_(role: string): UserRole {
  const normalized = role.trim().toLowerCase();
  if (normalized === 'admin' || normalized === 'manager' || normalized === 'employee' || normalized === 'user') {
    return normalized;
  }
  return 'user';
}
