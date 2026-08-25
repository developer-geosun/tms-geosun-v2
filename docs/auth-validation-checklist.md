# Auth Validation Checklist

Use this checklist after syncing frontend with backend auth API (`/api/v1/auth`).

## Environment

- [ ] Backend is running on `http://localhost:8080`.
- [ ] Swagger UI is reachable at `http://localhost:8080/swagger-ui.html`.
- [ ] Frontend uses backend base URL (not GAS route mode).

## Happy Path

- [ ] `POST /api/v1/auth/login` returns `accessToken`, `refreshToken`, `tokenType`, `expiresIn`, `user.role`.
- [ ] Frontend stores session and treats user as authenticated after login.
- [ ] `GET /api/v1/auth/me` succeeds with `Authorization: Bearer <accessToken>`.
- [ ] `POST /api/v1/auth/refresh` rotates session and frontend updates both tokens.
- [ ] `POST /api/v1/auth/logout` succeeds and frontend clears auth state.
- [ ] `POST /api/v1/auth/forgot-password` returns success for unknown email (anti-enumeration) and sends mail for verified users (check MailHog).
- [ ] `POST /api/v1/auth/reset-password` with token from email updates password; old password and old refresh fail.

## Security and Error Handling

- [ ] Request without access token to protected endpoint returns `401`.
- [ ] Expired/invalid access token triggers one refresh attempt in interceptor.
- [ ] Refresh failure clears session and redirects to `/login`.
- [ ] Insufficient role returns `403` and guard blocks protected route.
- [ ] Backend error payload with top-level `status` + `message` is handled by frontend.

## Regression Checks

- [ ] Auth guard still allows authorized users into protected routes.
- [ ] Auth guard still redirects unauthenticated users to `/login`.
- [ ] Existing i18n and routing behavior is unchanged.
- [ ] Backend README and system/spec docs match actual API paths and response fields.
