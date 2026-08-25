# Auth MVP Runbook

## 1) Подготовка backend (GAS)
- Развернуть web app с кодом из `backend/src/Code.gs`.
- В Script Properties задать `AUTH_SECRET` (длинное случайное значение).
- Проверить наличие листов:
  - `users` с колонками: `id`, `email`, `passwordHash`, `roles`, `status`
  - `refresh_sessions` с колонками: `tokenHash`, `userId`, `createdAt`, `expiresAt`, `revokedAt`

## 2) Подготовка тестового пользователя
- Создать запись в `users`:
  - `id`: `u_001`
  - `email`: `admin@example.com`
  - `passwordHash`: значение в формате `sha256:<salt>:<hash>`
  - `roles`: `admin`
  - `status`: `active`

## 3) Настройка frontend
- Указать backend URL в:
  - `frontend/src/environments/environment.ts` -> `apiUrl`
  - `frontend/src/environments/environment.prod.ts` -> `apiUrl`

## 4) Базовые проверки API
- `POST /auth/login` c валидным email/password:
  - ожидание: `200` + `accessToken`, `refreshToken`, `user`
- `GET /auth/me` без bearer:
  - ожидание: `401`
- `GET /auth/me` с bearer:
  - ожидание: `200` + профиль
- `POST /auth/refresh` с валидным `refreshToken`:
  - ожидание: `200` + новый `accessToken`
- `POST /auth/logout`, затем `POST /auth/refresh` со старым refresh:
  - ожидание: `401`

## 5) Базовые проверки frontend
- Открыть `/login`, войти валидными credentials:
  - ожидание: редирект на `/main`
- Проверить, что кнопка в toolbar меняется с login на logout после входа.
- Принудительно вызвать `401` на защищенном запросе:
  - ожидание: одноразовый refresh и повтор запроса
- При ошибке refresh:
  - ожидание: очистка auth state и редирект на `/login`

## 6) Команды проверки
- В `frontend/`:
  - `npm test -- --watch=false --browsers=ChromeHeadless`
