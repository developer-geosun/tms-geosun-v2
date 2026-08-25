# npm commands / Команды npm

Параллельные описания: в таблицах первая колонка — исходный текст, вторая — параллельный перевод. Блоки команд между таблицами — на всю ширину.

| Общие сведения | General |
| :-- | :-- |
| Команды выполняйте из каталога `frontend` (рядом лежит `package.json`). | Run commands from the `frontend` directory (where `package.json` lives). |

```powershell
cd E:\MyProjects\GeoSun\tms-geosun-v1\tms-geosun-v1\frontend
```

| Общие сведения | General |
| :-- | :-- |
| Нужны **Node.js** и **npm**, совместимые с версией **Angular** в этом репозитории (см. `package.json` и документацию Angular). | You need **Node.js** and **npm** compatible with the **Angular** version pinned in this repo (see `package.json` and Angular docs). |

| Зависимости | Dependencies |
| :-- | :-- |
| Установить зависимости по `package-lock.json` (типично после клона или обновления ветки). | Install dependencies from `package-lock.json` (typical after clone or branch updates). |

```powershell
npm ci
```

| Зависимости | Dependencies |
| :-- | :-- |
| Установить зависимости с возможным обновлением lock-файла. | Install dependencies and allow the lockfile to be updated when ranges change. |

```powershell
npm install
```

| Локальная разработка | Local development |
| :-- | :-- |
| Запуск dev-сервера Angular с прокси (`proxy.conf.json`). Перед `start` срабатывает `prestart`: скрипт подставляет HERE API key из `HERE_API_KEY` или из `.env` в корне репозитория в `src/assets/app-config.local.js`. | Angular dev server with `proxy.conf.json`. `prestart` runs first: syncs the HERE API key from `HERE_API_KEY` or repo-root `.env` into `src/assets/app-config.local.js`. |

```powershell
npm start
```

| Сборка | Production build |
| :-- | :-- |
| Продакшен-сборка (`ng build`, конфигурация по умолчанию в `angular.json` — production). Перед сборкой выполняется `prebuild` (тот же sync ключа HERE). | Production build (`ng build`; default configuration in `angular.json` is production). `prebuild` runs first (same HERE key sync). |

```powershell
npm run build
```

| Сборка | Production build |
| :-- | :-- |
| Артефакты попадают в каталог (см. `outputPath` в `angular.json`). | Build output directory (see `outputPath` in `angular.json`). |
| `dist/tms-geosun` | `dist/tms-geosun` |

| Режим watch | Watch mode |
| :-- | :-- |
| Сборка в режиме наблюдения за файлами (development-конфигурация). | Rebuild on file changes using the development configuration. |

```powershell
npm run watch
```

| Тесты | Tests |
| :-- | :-- |
| Однократный прогон unit-тестов в **ChromeHeadless** (скрипт в `package.json`). | Single Karma run in **ChromeHeadless** (see `package.json` script). |

```powershell
npm test
```

| ESLint | ESLint |
| :-- | :-- |
| Перевірка стилю та правил для `*.ts` / `*.html` у `src/` (конфіг `eslint.config.js`, ціль `ng lint`). | Lint TypeScript and templates under `src/` (`eslint.config.js`, `ng lint` target). |

```powershell
npm run lint
```

| ESLint (автофікс) | ESLint (autofix) |
| :-- | :-- |

```powershell
npm run lint:fix
```

| Публикация | Deploy (GitHub Pages) |
| :-- | :-- |
| Сборка с `--base-href=/tms-geosun-v1/` и выкладка содержимого `dist/tms-geosun` через **gh-pages** (нужны права на репозиторий и настроенный `git remote`). | Production build with `--base-href=/tms-geosun-v1/` and publish `dist/tms-geosun` via **gh-pages** (requires repo permissions and a configured `git remote`). |

```powershell
npm run deploy
```

| Диагностика и обслуживание | Diagnostics and maintenance |
| :-- | :-- |
| Показать устаревшие пакеты. | List outdated packages. |

```powershell
npm outdated
```

| Диагностика и обслуживание | Diagnostics and maintenance |
| :-- | :-- |
| Проверка известных уязвимостей в зависимостях. | Audit dependencies for known vulnerabilities. |

```powershell
npm audit
```

| Angular CLI | Angular CLI |
| :-- | :-- |
| Вызвать CLI напрямую (генерация кода, справка и т.д.). | Invoke the Angular CLI directly (schematics, help, etc.). |

```powershell
npx ng version
npx ng generate component my-widget
```

| Замечания | Notes |
| :-- | :-- |
| Скрипты `start` и `build` завязаны на `scripts/sync-here-key.mjs`; без ключа в `.env` / окружении локальная карта HERE может не работать. | `start` and `build` depend on `scripts/sync-here-key.mjs`; without a key in `.env` / env, local HERE features may not work. |
| Для воспроизводимых CI-сборок предпочтительнее **`npm ci`**, чем `npm install`. | For reproducible CI installs, prefer **`npm ci`** over `npm install`. |
