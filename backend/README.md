# tms-geosun-backend-java

MVP backend for authentication and authorization based on Java 21 + Spring Boot 3.

## Local run (without Docker)

1. Ensure MySQL 8 is running.
2. Copy `.env.example` values into your environment.
3. Run:

```bash
mvn spring-boot:run
```

## Local run (Docker Compose)

```bash
docker compose up --build
```

## Full stack run (frontend + backend + mysql)

From project root (`tms-geosun-v1`) run:

1. Copy root env template and adjust values if needed:
```bash
cp .env.example .env
```

2. Start all services:
```bash
docker compose up --build
```

Available URLs:
- Frontend: `http://localhost:4200`
- Backend health: `http://localhost:8080/actuator/health`
- Swagger UI: `http://localhost:8080/swagger-ui.html`

## Useful endpoints

- Health: `http://localhost:8080/actuator/health`
- Swagger UI: `http://localhost:8080/swagger-ui.html`

## Frontend integration

- Backend auth prefix: `/api/v1/auth`
- Main auth endpoints:
  - `POST /api/v1/auth/login`
  - `POST /api/v1/auth/refresh`
  - `POST /api/v1/auth/logout`
  - `GET /api/v1/auth/me`
- Base URL for frontend local integration: `http://localhost:8080`
- API contracts can be inspected in Swagger UI: `http://localhost:8080/swagger-ui.html`

## Tests and coverage

- Run all tests: `mvn test`
- Run tests and enforce JaCoCo line coverage (bundle minimum 55%): `mvn verify`
- HTML report after tests: `target/site/jacoco/index.html`

Integration tests use profile `test` (H2 in-memory, Flyway off, mocked `JavaMailSender`). Actuator mail health is disabled in that profile so the mock does not break startup.
