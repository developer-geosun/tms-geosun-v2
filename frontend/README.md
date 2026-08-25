# tms-geosun

Angular 21 application for GeoSun transport management scenarios.

## Tech stack

- Angular `21.2.x`
- Angular Material/CDK `21.2.x`
- TypeScript `5.9.x`
- i18n: `@ngx-translate/core` + `@ngx-translate/http-loader`

## Requirements

- Node.js `>=20`
- npm `>=10`

## Getting started

Install dependencies:

```bash
npm install
```

Run dev server:

```bash
npm start
```

Application is available at `http://localhost:4200/`.

### Dev server in Docker (hot reload)

From the project root (`tms-geosun-v1`), use the dev profile:

```bash
docker compose stop frontend
docker compose --profile dev up -d frontend-dev
```

Open `http://localhost:4200`.

Notes:
- `frontend-dev` is optimized for fast UI iteration (Angular `ng serve` with hot reload).
- `frontend` is a production preview container (static build + nginx).
- Docker dev mode uses `proxy.docker.conf.json` and forwards `/api` to `http://backend:8080`.
- For public API access use `ngrok` / `ngrok-dev` (backend only). Frontend for public use is on GitHub Pages.
- On first `frontend-dev` start dependencies are installed; next starts are faster.

## Build

Production build:

```bash
npm run build
```

Artifacts are generated in `dist/tms-geosun`.

## Tests

Unit tests are temporarily disabled in `package.json` (`npm test` returns a placeholder message).

To restore Karma tests, set script `test` back to:

```bash
ng test
```

## Deployment

### GitHub Actions

Deployment is configured via `.github/workflows/deploy.yml` and runs on push to `main` or `master` when `frontend/**` changes (or via manual `workflow_dispatch`).

Required repository secrets:

- `API_URL` — public backend base URL (ngrok), written into `assets/app-config.js` at deploy time
- `HERE_API_KEY` — optional HERE key for maps on Pages

GitHub Pages source: branch `gh-pages` / root.

### Manual deploy to GitHub Pages

```bash
npm run deploy
```

The deploy command uses:

- base href: `/tms-geosun-v1/`
- output directory: `dist/tms-geosun`

## Useful commands

```bash
npm run watch
npm run ng -- version
```

## AI setup (Cursor)

To use Angular AI tooling with Cursor in this project:

1. Create `frontend/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "angular-cli": {
      "command": "npx",
      "args": ["-y", "@angular/cli", "mcp"]
    }
  }
}
```

2. Optional safe mode (read-only MCP tools):

```json
{
  "mcpServers": {
    "angular-cli": {
      "command": "npx",
      "args": ["-y", "@angular/cli", "mcp", "--read-only"]
    }
  }
}
```

3. Add Angular AI rules file at `frontend/.cursor/rules/angular-best-practices.mdc`.

4. Reload Cursor window/workspace.

### Quick verification

- Open a new Cursor chat from `frontend`.
- Ask for Angular guidance (for example, request best practices for signals or modern template control flow).
- Confirm the assistant responds using Angular-aware recommendations and project context.
