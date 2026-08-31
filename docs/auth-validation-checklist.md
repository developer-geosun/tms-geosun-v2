# Чекліст валідації автентифікації / Auth Validation Checklist

[Українська](#українська) | [English](#english)

---

## Українська

Використовуйте цей чекліст після синхронізації frontend з backend auth API (`/api/v1/auth`).

### Середовище

- [ ] Backend запущений на `http://localhost:8080`.
- [ ] Swagger UI доступний за адресою `http://localhost:8080/swagger-ui.html`.
- [ ] Frontend використовує базовий URL backend (не режим маршрутів GAS).

### Успішний сценарій (Happy Path)

- [ ] `POST /api/v1/auth/login` повертає `accessToken`, `refreshToken`, `tokenType`, `expiresIn`, `user.role`.
- [ ] Frontend зберігає сесію і вважає користувача автентифікованим після входу.
- [ ] `GET /api/v1/auth/me` успішний із заголовком `Authorization: Bearer <accessToken>`.
- [ ] `POST /api/v1/auth/refresh` ротує сесію, і frontend оновлює обидва токени.
- [ ] `POST /api/v1/auth/logout` успішний, і frontend очищає стан автентифікації.
- [ ] `POST /api/v1/auth/forgot-password` повертає успіх для невідомого email (анти-енумерація) і надсилає лист для верифікованих користувачів (перевірити в MailHog).
- [ ] `POST /api/v1/auth/reset-password` з токеном із листа оновлює пароль; старий пароль і старий refresh не працюють.

### Безпека та обробка помилок

- [ ] Запит без access token до захищеного endpoint повертає `401`.
- [ ] Прострочений або невалідний access token спричиняє одну спробу refresh в interceptor.
- [ ] Невдалий refresh очищає сесію і перенаправляє на `/login`.
- [ ] Недостатня роль повертає `403`, і guard блокує захищений маршрут.
- [ ] Payload помилки backend із верхньорівневими `status` + `message` обробляється frontend.

### Регресійні перевірки

- [ ] Auth guard як і раніше допускає авторизованих користувачів до захищених маршрутів.
- [ ] Auth guard як і раніше перенаправляє неавтентифікованих користувачів на `/login`.
- [ ] Існуюча поведінка i18n і маршрутизації не змінилася.
- [ ] README backend і системна/специфікаційна документація відповідають фактичним шляхам API та полям відповіді.

---

## English

Use this checklist after syncing frontend with backend auth API (`/api/v1/auth`).

### Environment

- [ ] Backend is running on `http://localhost:8080`.
- [ ] Swagger UI is reachable at `http://localhost:8080/swagger-ui.html`.
- [ ] Frontend uses backend base URL (not GAS route mode).

### Happy Path

- [ ] `POST /api/v1/auth/login` returns `accessToken`, `refreshToken`, `tokenType`, `expiresIn`, `user.role`.
- [ ] Frontend stores session and treats user as authenticated after login.
- [ ] `GET /api/v1/auth/me` succeeds with `Authorization: Bearer <accessToken>`.
- [ ] `POST /api/v1/auth/refresh` rotates session and frontend updates both tokens.
- [ ] `POST /api/v1/auth/logout` succeeds and frontend clears auth state.
- [ ] `POST /api/v1/auth/forgot-password` returns success for unknown email (anti-enumeration) and sends mail for verified users (check MailHog).
- [ ] `POST /api/v1/auth/reset-password` with token from email updates password; old password and old refresh fail.

### Security and Error Handling

- [ ] Request without access token to protected endpoint returns `401`.
- [ ] Expired/invalid access token triggers one refresh attempt in interceptor.
- [ ] Refresh failure clears session and redirects to `/login`.
- [ ] Insufficient role returns `403` and guard blocks protected route.
- [ ] Backend error payload with top-level `status` + `message` is handled by frontend.

### Regression Checks

- [ ] Auth guard still allows authorized users into protected routes.
- [ ] Auth guard still redirects unauthenticated users to `/login`.
- [ ] Existing i18n and routing behavior is unchanged.
- [ ] Backend README and system/spec docs match actual API paths and response fields.
