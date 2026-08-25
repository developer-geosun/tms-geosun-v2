# Запуск проекта

Этот файл описывает основные варианты запуска `tms-geosun-v1`.

## Требования

- Node.js `>=20`
- npm `>=10`
- Java `21`
- Maven `3.9+`
- MySQL `8` (для локального запуска backend без Docker)
- Docker Desktop + Docker Compose (для запуска всего стека в контейнерах)

## Публикация: frontend на GitHub Pages, API через ngrok или статический IP

Архитектура для публичного доступа:

- **Frontend** — статика на GitHub Pages (`https://developer-geosun.github.io/tms-geosun-v1/`).
- **Backend** — локально (Docker), наружу по выбору: **ngrok** или **статический IP** провайдера (без проксирования UI).

Режим задаётся в корневом `.env`:

| Переменная | Значение | Эффект |
| --- | --- | --- |
| `PUBLIC_ACCESS_MODE` | `static-ip` | Без туннеля; API на `PUBLIC_API_URL` (порт `SERVER_PORT` на хосте) |
| `PUBLIC_ACCESS_MODE` | `ngrok` | Нужен `COMPOSE_PROFILES=ngrok` + `NGROK_*` |
| `PUBLIC_API_URL` | URL API | Для справки / совпадения с GitHub Secret `API_URL` |
| `COMPOSE_PROFILES` | `ngrok` или пусто | Включает сервис `ngrok` в Compose |

### 1) GitHub secrets (Settings → Secrets and variables → Actions)

| Secret | Назначение |
| --- | --- |
| `API_URL` | Публичный URL backend: `https://<NGROK_DOMAIN>` **или** `http://178.136.237.7:8080` |
| `HERE_API_KEY` | (опционально) ключ HERE для карт на Pages |

> **HTTPS / mixed content:** GitHub Pages отдаёт UI по HTTPS. Браузер может блокировать запросы к `http://…` API. Для стабильной работы со статическим IP лучше HTTPS (домен + nginx/Caddy) или режим ngrok (HTTPS из коробки).

### 2) GitHub Pages

Settings → Pages → Build and deployment → Source: **Deploy from a branch** → Branch: **`gh-pages`** / `/ (root)`.

Workflow `.github/workflows/deploy.yml` собирает frontend и пушит в `gh-pages` при push в `master`/`main` (изменения в `frontend/**`) или вручную (`workflow_dispatch`).

### 3a) Backend + статический IP (Vodafone и т.п.)

В `.env`:

```bash
PUBLIC_ACCESS_MODE=static-ip
PUBLIC_API_URL=http://178.136.237.7:8080
# COMPOSE_PROFILES не задавать (или оставить пустым) — сервис ngrok не стартует
CORS_ALLOWED_ORIGIN_PATTERNS=https://developer-geosun.github.io
EMAIL_VERIFICATION_LINK_BASE=https://developer-geosun.github.io/tms-geosun-v1/verify-email
PASSWORD_RESET_LINK_BASE=https://developer-geosun.github.io/tms-geosun-v1/reset-password
```

На роутере пробросьте TCP-порт `8080` (или ваш `SERVER_PORT`) на ПК, где крутится Docker.

Запуск API без туннеля:

```bash
docker compose up --build mysql mailhog backend
```

Проверка снаружи: `http://178.136.237.7:8080/actuator/health`

В GitHub Secrets `API_URL` = `http://178.136.237.7:8080`, затем перезапустите Deploy workflow.

### 3b) Backend + ngrok

В `.env`:

```bash
PUBLIC_ACCESS_MODE=ngrok
COMPOSE_PROFILES=ngrok
NGROK_AUTHTOKEN=<ваш_ngrok_authtoken>
NGROK_DOMAIN=<ваш_домен_из_ngrok>
PUBLIC_API_URL=https://<NGROK_DOMAIN>
CORS_ALLOWED_ORIGIN_PATTERNS=https://developer-geosun.github.io
EMAIL_VERIFICATION_LINK_BASE=https://developer-geosun.github.io/tms-geosun-v1/verify-email
PASSWORD_RESET_LINK_BASE=https://developer-geosun.github.io/tms-geosun-v1/reset-password
```

Запуск API с публичным туннелем:

```bash
docker compose up --build mysql mailhog backend ngrok
```

или (если задан `COMPOSE_PROFILES=ngrok`):

```bash
docker compose up --build mysql mailhog backend
```

После старта туннеля значение `API_URL` в GitHub Secrets должно совпадать с `https://<NGROK_DOMAIN>` (и при смене домена — перезапустить Deploy workflow).

## Вариант 1: локальный запуск (frontend + backend по отдельности)

### 1) Backend

Из корня проекта:

```bash
cd backend
mvn spring-boot:run
```

Перед запуском убедитесь, что:
- MySQL 8 запущен;
- переменные окружения из `backend/.env.example` настроены.

### 2) Frontend

Из корня проекта:

```bash
cd frontend
npm install
npm start
```

Перед `npm start` в корневом `.env` задайте `HERE_API_KEY=<ваш_ключ_here>` — ключ будет автоматически подставлен в локальный `frontend/src/assets/app-config.local.js` (файл игнорируется git).

Frontend будет доступен по адресу: `http://localhost:4200`.

## Вариант 2: запуск всего стека через Docker Compose

1. Создайте `.env` на основе шаблона `.env.example`.

```bash
cp .env.example .env
```

- Для production-сборки frontend оставьте `FRONTEND_BUILD_CONFIGURATION=production`.
- Для dev-сборки frontend в Docker укажите `FRONTEND_BUILD_CONFIGURATION=development` (в этом режиме будут видны dev-значения из `environment.ts`, включая автозаполнение тестового логина).
- Для страницы расчета через HERE укажите `HERE_API_KEY=<ваш_ключ_here>`.
- Для выбора источника расчёта пробега по странам укажите `COUNTRY_BREAKDOWN_PROVIDER=here|geojson` (для режима без HERE — `geojson`).
- Для публичного API выберите режим в `.env` (`PUBLIC_ACCESS_MODE=static-ip` или `ngrok`):
  - **static-ip:** `PUBLIC_API_URL=http://178.136.237.7:8080`, без `COMPOSE_PROFILES`; на роутере — проброс порта `8080`
  - **ngrok:** `COMPOSE_PROFILES=ngrok`, `NGROK_AUTHTOKEN`, `NGROK_DOMAIN`, `PUBLIC_API_URL=https://<NGROK_DOMAIN>`
  - в обоих случаях: `CORS_ALLOWED_ORIGIN_PATTERNS=https://developer-geosun.github.io` и link-base на GitHub Pages

2. Запуск контейнеров (из корня проекта):

```bash
docker compose up --build
```

3. Остановка и удаление контейнеров:

```bash
docker compose down
```

### Быстрый dev-цикл frontend (hot reload в Docker)

Когда вы активно меняете UI, удобнее запускать `frontend-dev` (Angular dev server), а не production-`frontend` через nginx.

1. Остановите production frontend (если уже запущен):

```bash
docker compose stop frontend
```

2. Запустите dev frontend с hot reload:

```bash
docker compose --profile dev up -d frontend-dev
```

3. Откройте приложение:

`http://localhost:4200`

Изменения в `frontend/src/*` будут применяться автоматически без пересборки Docker-образа.

4. Остановить только dev frontend:

```bash
docker compose --profile dev stop frontend-dev
```

5. Полностью остановить dev-профиль (рекомендуется в конце сессии):

```bash
docker compose --profile dev down --remove-orphans
```

Примечания:
- `frontend` — это production preview (build + nginx), подходит для проверки итоговой сборки.
- `frontend-dev` — это режим разработки (ng serve), подходит для быстрых правок и тестирования.
- В Docker dev-режиме API проксируется через `frontend/proxy.docker.conf.json` на `http://backend:8080`.
- Для публичного API: режим `static-ip` (порт на хосте) или профили Compose `ngrok` / `ngrok-dev`.
- Для ссылок из писем укажите `EMAIL_VERIFICATION_LINK_BASE` на URL frontend (локальный или GitHub Pages).
- На первом запуске `frontend-dev` установит зависимости (`npm ci`), далее старт обычно заметно быстрее.
- Если выполнить обычный `docker compose down` без `--profile dev`, может появиться `Network ... Resource is still in use`, потому что dev-контейнеры останутся запущенными.

### Dev-профиль (frontend-dev + backend)

```bash
docker compose --profile dev up -d --build mysql mailhog backend frontend-dev
```

С публичным API через ngrok в dev:

```bash
docker compose --profile dev --profile ngrok-dev up -d --build mysql mailhog backend frontend-dev ngrok-dev
```

```bash
# остановка (включая ngrok-dev, если был запущен)
docker compose --profile dev --profile ngrok-dev down --remove-orphans
```

Локальный вход через gateway (опционально): `http://localhost:8082` (или `GATEWAY_DEV_PORT`).

### Быстрые команды

Запуск:

```bash
docker compose up --build
```

Остановка:

```bash
docker compose down
```

Быстрый dev frontend (hot reload):

```bash
docker compose stop frontend
docker compose --profile dev up -d frontend-dev
```

Публичный API (backend + статический IP, без ngrok):

```bash
docker compose up --build mysql mailhog backend
```

Публичный API (backend + ngrok):

```bash
docker compose --profile ngrok up --build mysql mailhog backend ngrok
```

Полная остановка dev-профиля (без "Network ... Resource is still in use"):

```bash
docker compose --profile dev --profile ngrok-dev down --remove-orphans
```

### Локальный стек с gateway (без публичного туннеля)

```bash
docker compose up --build mysql mailhog backend frontend gateway
```

## Полезные URL после запуска

- Frontend (локально): `http://localhost:4200`
- Frontend (GitHub Pages): `https://developer-geosun.github.io/tms-geosun-v1/`
- Backend health: `http://localhost:8080/actuator/health`
- Swagger UI: `http://localhost:8080/swagger-ui.html`
- Gateway (единый локальный вход): `http://localhost:8081`
- ngrok Inspector: `http://localhost:4040` (только при профиле `ngrok`)
- Public API health (static-ip): `http://178.136.237.7:8080/actuator/health`
- Public API health (ngrok): `https://<NGROK_DOMAIN>/actuator/health`

## Быстрая проверка backend auth API

Префикс auth API: `/api/v1/auth`

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
