# ТЗ: сценарий себестоимости, дороги Европы, маржа и курсы НБУ

## Правила языка документа
- Основной язык: **RU** (термины API/кода: английский по принятому в проекте стилю).
- **Правила расчёта (формулы, статьи затрат, v1):** [`freight-trip-cost-calculation-rules-margin30-ua8150-driverpct.md`](./freight-trip-cost-calculation-rules-margin30-ua8150-driverpct.md) — **источник истины** для детерминированного калькулятора; при расхождении с этим ТЗ приоритет у файла правил.
- Связанные документы: `currencies-reference.md`, `routes-server-workflow-and-freight-quoting.md`, `route-immutability-list-filters-deferred-country-breakdown.md`, `route-point-operations-rules.md`, `auth-authentication-authorization.md`, `system.md`.

## 1. Цель
**Вариант** расчёта: дать **ADMIN** и **MANAGER** воспроизводимый **серверный** расчёт себестоимости и формирование **quote** по заявке:
- параметры — в **сценарии** в БД (ADMIN/MANAGER задают при CRUD; при расчёте — выбор `scenarioId` + снимок на дату);
- конвертация — **курсы НБУ из БД** на `calculationDate` (§6);
- формулы — по [файлу правил](./freight-trip-cost-calculation-rules-margin30-ua8150-driverpct.md).

Геометрия — **snapshot маршрута заявки**, без dispatch point.

## 2. Контекст
- Есть: `Route`, `RouteRequest`, `FreightQuote`, admin API заявок, роли `ADMIN` / `MANAGER` / `USER`.
- **Этот ТЗ:** числовые сценарии в БД, формульный калькулятор, те же заявки/quote; отдельные API/экраны или расширение карточки заявки (уточнить при реализации).
- Курсы НБУ: `currency_nbu_rates`, sync/чтение — `currencies-reference.md`; **не дублировать** API НБУ в расчёте фрахта.
- **MANAGER = ADMIN** для CRUD сценариев, расчёта и отправки quote по этому варианту (§8).

## 3. Область работ (In scope)
- [x] 1. CRUD **сценариев** (поля §5) и выбор сценария по заявке (снимок в расчёте/quote).
- [x] 2. **Расчёт себестоимости** по [правилам](./freight-trip-cost-calculation-rules-margin30-ua8150-driverpct.md), JSON **breakdown**, аудит входов.
- [x] 3. **Текстовое описание расчёта** — человекочитаемое сообщение с пошаговым описанием проведённых вычислений (§7.1); формируется **на сервере** при каждом `cost-preview` и сохраняется вместе с расчётом.
- [x] 4. **Справочник стран** (§5.2): seed стран Европы, **только просмотр** в admin UI.
- [x] 5. **Country breakdown** и дороги EU — только после `scenarioId` (§3.1).
- [x] 6. **Курсы НБУ** на `calculationDate` (§6).

### 3.1 Порядок операций
- `POST /api/v1/route-requests` **не** запускает breakdown (`route-immutability-list-filters-deferred-country-breakdown.md` §3.3).
- Breakdown и расчёт — **только с `scenarioId`**; смена сценария **инвалидирует** старый breakdown.
- Без breakdown дорог — расчёт **не выполняется** (см. файл правил).

## 4. Вне области (Out of scope)
- Точка 0 / dispatch point; бухучёт, НДС; автовыбор маршрута; прогноз курса; вызов API НБУ из потока расчёта.
- CRUD справочника стран (создание/редактирование записей) — **после v1**; в v1 только чтение и Flyway-seed.

## 5. Модель сценария (`FreightCalculationScenario`)

Серверная сущность: `id`, `name`, `isActive`, аудит. Числовые поля **задаёт ADMIN/MANAGER**; эталон v1 — в [правилах](./freight-trip-cost-calculation-rules-margin30-ua8150-driverpct.md).

| Параметр | Единица | Назначение |
|----------|---------|------------|
| `fuelConsumptionEmptyLPer100km` | л/100 км | Расход порожний |
| `fuelConsumptionLoadedNonWinterLPer100km` | л/100 км | Расход гружёный, не зима |
| `fuelConsumptionLoadedWinterLPer100km` | л/100 км | Расход гружёный, зима |
| `seasonMode` | enum | `WINTER` / `NON_WINTER` / `AUTO` |
| `fuelPricePerLiter` | UAH/л | Цена топлива |
| `driverSalaryPercentOfFreight` | % | ЗП от итогового фрахта (`PERCENT_OF_FINAL_FREIGHT`) |
| `perDiemUsdPerDay` | валюта/день | Суточные (в v1 — EUR/день, см. правила) |
| `perDiemRouteDivisorKm` | км | Делитель для дней (дефолт 600) |
| `perDiemFixedExtraDays` | дни | Добавка (дефолт +2) |
| `marginType` | enum | `PERCENT_OF_COST_BEFORE_MARGIN` / `FIXED_PER_TRIP` |
| `marginPercent` | % | Маржа от себестоимости до маржи (с ЗП) |
| `marginFixedAmount` | сумма в `proposalCurrency` | При `FIXED_PER_TRIP` — маржа на рейс; в расчёте → UAH по курсу НБУ |
| `proposalCurrency` | ISO 4217 | Валюта quote (часто EUR) |
| `tollTariffSetId` | UUID | **Набор тарифов дорог**, который использует сценарий (§5.1) |

### 5.1 Наборы тарифов дорог (`TollTariffSet` + `CountryTollRule`)

Может существовать **несколько наборов** тарифов; **каждый числовой сценарий ссылается ровно на один** активный набор (`tollTariffSetId`). Разные сценарии могут использовать один и тот же набор или разные.

| Сущность | Поля | Назначение |
|----------|------|------------|
| **`TollTariffSet`** | `id`, `name`, `description?`, `isActive`, аудит | Именованный профиль тарифов (напр. «EU v1», «EU консервативный») |
| **`CountryTollRule`** | `toll_tariff_set_id`, `country_code`, `toll_type`, `rate`, `fixed_days?`, `is_active` | Ставка по стране **внутри набора**; уникальность `(toll_tariff_set_id, country_code)` |

- Калькулятор при `cost-preview` берёт правила дорог **только из набора**, привязанного к выбранному сценарию (снимок `tollTariffSetId` + ставок — в breakdown/аудите расчёта).
- CRUD наборов и правил — отдельно от CRUD сценария; в форме сценария — `mat-select` набора.
- Seed v1: один набор «EU default» со ставками из [правил](./freight-trip-cost-calculation-rules-margin30-ua8150-driverpct.md); дефолтный сценарий ссылается на него.
- Удаление набора: запрещено, если на него ссылаются активные сценарии (`409 TOLL_TARIFF_SET_IN_USE`); иначе soft-deactivate.
- `country_code` в `CountryTollRule` и в breakdown — **ISO 3166-1 alpha-2 в UPPERCASE**, согласован с справочником §5.2 (логическая связь; FK в v1 опционально).

### 5.2 Справочник стран (`CountryReference`)

Статический справочник для отображения кодов стран в UI (тарифы дорог, breakdown, отчёты). **v1: только просмотр**, без API создания/редактирования.

| Поле (API) | БД | Описание |
|------------|-----|----------|
| `codeAlpha2` | `code_alpha2` PK | 2 буквы (ISO 3166-1), **только ВЕРХНИЙ регистр**, напр. `PL`, `DE`, `UA` |
| `codeAlpha3` | `code_alpha3` | 3 буквы, **только ВЕРХНИЙ регистр**, напр. `POL`, `DEU`, `UKR` |
| `nameUk` | `name_uk` | Название украинским |
| `nameEn` | `name_en` | Название английским |
| `nameRu` | `name_ru` | Название русским |

**Регистр кодов:** во всей системе (БД, seed, API, UI, `country_code` в тарифах и breakdown) сокращения стран — **строго UPPERCASE**. Backend при чтении path/query нормализует ввод (`pl` → `PL`); ответ API — только верхний регистр.

**Seed (Flyway):** однократное заполнение **странами географической Европы** (ISO 3166-1; включая государства Европы, используемые в маршрутах TMS: EU, UK, CH, NO, UA, MD, RS, BA, AL, MK, ME, XK и др.; **~45–50 записей**). Источник данных — миграция `V*__seed_europe_countries.sql` (фиксированный список в репозитории, без внешнего API при деплое).

**Сортировка в UI:** по `code_alpha2` или по `name_uk` (настраивается на frontend).

**RBAC:** просмотр — `ADMIN`, `MANAGER` (как остальные admin-справочники).

## 6. Курсы НБУ
- Источник: `currency_nbu_rates`; sync — `POST /api/v1/admin/currencies/nbu-rates/sync` (`currencies-reference.md`).
- Перед расчётом ADMIN/MANAGER обновляет курсы на **`/admin/currencies`**; расчёт **не** вызывает API НБУ.
- На `calculationDate`: если нет снимка на точную дату — берётся **ближайший предыдущий** рабочий день с полным набором активных валют; если и его нет → **`422`** `NBU_RATES_NOT_AVAILABLE_FOR_DATE`.
- Кросс: `A/B = ratePerUnit_A / ratePerUnit_B`; в breakdown — снимок курсов.

## 7. Данные и аудит
- **`FreightCostCalculation`** / **`FreightQuote`**: `route_request_id`, `scenario_id`, `calculation_date`, снимок сценария, JSON breakdown, длины, `driver_salary_basis` — перечень полей breakdown см. [правила](./freight-trip-cost-calculation-rules-margin30-ua8150-driverpct.md) § «Аудит».

### 7.1 Текстовое описание расчёта (`calculationSummary`)

При каждом успешном **`cost-preview`** сервер **детерминированно** формирует многострочное текстовое поле **`calculationSummary`** (plain text, UTF-8) — краткий отчёт для ADMIN/MANAGER: что и как посчитано, без ИИ.

**Сохранение:** колонка `calculation_summary` (`TEXT`) в `freight_cost_calculations`; дублируется в ответе API `CostPreviewResponse.calculationSummary`. При создании quote из расчёта — опционально копировать в `FreightQuote.internalNote` (если поле пустое) или отдавать отдельным полем в DTO для ручной вставки.

**Язык текста:** украинский (основной для операторов); при необходимости позже — параметр `locale` в запросе (`uk` / `ru` / `en`), v1 достаточно `uk`.

**Структура сообщения (обязательные блоки, в указанном порядке):**

1. **Заголовок:** дата расчёта (`calculationDate`), имя сценария, `proposalCurrency`.
2. **Входы:** `L_total_km`, `L_empty_km`, `L_loaded_km`; использованный сезон (`season_used`); допущения (например fallback 15%/85%, если применялось).
3. **Курсы НБУ:** дата снимка; EUR/UAH, USD/UAH (и иные, если участвовали в конвертации); формула кросс-курса для итога в `proposalCurrency`.
4. **Топливо:** расход порожний/гружёный (л), цена за л, промежуточные суммы в UAH.
5. **Суточные:** число дней (формула), ставка EUR/день, сумма в EUR и UAH.
6. **Дороги:** по каждой стране из breakdown — км, тип тарифа, ставка, сумма; итог по дорогам в UAH.
7. **Прямые затраты:** `DirectCost` в UAH.
8. **ЗП и маржа:** база ЗП (`driverSalaryBasis`, %), закрытая формула или итерации; `DriverCost`, себестоимость до маржи `S`, `Margin`, итог `T` в UAH.
9. **Итог для клиента:** сумма в `proposalCurrency` с указанием курса пересчёта.

Числа в тексте — **те же**, что в JSON breakdown (округление 2 знака, политика проекта). Генератор: `FreightCostCalculationSummaryBuilder` (или аналог) в backend; **не** формировать на frontend.

**UI (§9):** после preview показывать `calculationSummary` в `mat-card` / `mat-expansion-panel` с моноширинным шрифтом (`white-space: pre-wrap`); кнопки «Копіювати» и (опц.) «Додати в internal note quote».

## 8. API (черновик)

### 8.1 RBAC
| Операция | ADMIN | MANAGER | USER |
|----------|-------|---------|------|
| CRUD `/api/v1/admin/freight-numeric-scenarios` | ✓ | ✓ | — |
| Просмотр `/api/v1/admin/country-reference` | ✓ | ✓ | — |
| `country-breakdown`, `cost-preview`, quote | ✓ | ✓ | — |
| Sync/просмотр курсов НБУ | ✓ | ✓ | — |

### 8.2 Endpoints
- `GET|POST|PUT|PATCH|DELETE /api/v1/admin/freight-numeric-scenarios` (+ `{id}`).
- `GET|POST|PUT|PATCH|DELETE /api/v1/admin/toll-tariff-sets` (+ `{id}`).
- `GET|POST|PUT|PATCH|DELETE /api/v1/admin/toll-tariff-sets/{setId}/country-toll-rules` (+ `{ruleId}`).
- `GET /api/v1/admin/country-reference` — список стран (query `search?` по коду/названию); `GET .../{codeAlpha2}` — одна страна. **Без** POST/PUT/PATCH/DELETE в v1.
- `POST .../route-requests/{id}/country-breakdown` — тело: **`scenarioId`**.
- `POST .../route-requests/{id}/cost-preview` — `scenarioId`, `calculationDate`, `seasonOverride?`.
- `POST .../route-requests/{id}/quotes` — формирование quote.
- Курсы: `GET /api/v1/admin/currencies/nbu-rates`, `POST .../nbu-rates/sync`.

## 9. Frontend (Angular Material)
- [x] Заявка: сценарий → breakdown → `calculationDate`, курсы → таблица стран → preview/quote в `proposalCurrency`.
- [x] После preview — блок **«Опис розрахунку»**: текст `calculationSummary`, копирование в буфер (§7.1).
- [x] Нет курсов на дату — переход на **`/admin/currencies`**.
- [x] Экраны: **сценарии расчёта** (`/admin/freight-numeric-scenarios`, выбор `tollTariffSetId`), **наборы тарифов дорог**, **справочник стран** (только просмотр, §5.2).
- [x] `/admin/currencies` — просмотр снимка НБУ на выбранную дату (`rateDate`).
- [x] Quote: prefill формы и «Створити чернетку з розрахунку» (`fromCostCalculationId`).
- [x] Таблица тарифов дорог — колонка `nameUk` из справочника.
- [ ] Таблица **breakdown на заявке** — `nameUk` / `nameRu` (опционально v1; API готов).

## 10. Критерии приёмки
- [x] MANAGER = ADMIN для сценариев, расчёта, quote (новые endpoint — `@PreAuthorize` ADMIN/MANAGER).
- [x] Breakdown и расчёт NBU только с `scenarioId`; смена сценария инвалидирует breakdown.
- [x] Реализация формул v1 — по [файлу правил](./freight-trip-cost-calculation-rules-margin30-ua8150-driverpct.md) (код калькулятора; **автотесты эталона — нет**).
- [x] Курсы из БД на `calculationDate` (ближайший предыдущий полный снимок §11.10); иначе `422`.
- [x] Геометрия и запрет расчёта без breakdown — как в файле правил.
- [x] При `cost-preview` — `calculationSummary` (§7.1), сохранение в `freight_cost_calculations`.
- [x] Справочник стран: seed Европы; UI `/admin/country-reference` read-only.
- [x] Quote из `cost-preview` (`fromCostCalculationId` / prefill) — backend + UI на карточке заявки.
- [x] Интеграционные тесты `FreightNumericPricingApiIntegrationTest` — breakdown → preview → quote.

## 11. Принятые решения (архитектура)

| # | Тема | Решение |
|---|------|---------|
| 11.1 | Формулы и дефолты v1 | [`freight-trip-cost-calculation-rules-margin30-ua8150-driverpct.md`](./freight-trip-cost-calculation-rules-margin30-ua8150-driverpct.md) |
| 11.2 | MANAGER и quote | MANAGER = ADMIN: создание, редактирование, **отправка** quote |
| 11.3 | Курсы НБУ | На `calculationDate` из БД; обновление только через `/admin/currencies` |
| 11.4 | Параметры сценария | Задаёт ADMIN/MANAGER в CRUD; в расчёте — значения выбранного сценария + снимок |
| 11.5 | Текст расчёта | Серверный `calculationSummary` при каждом preview; язык v1 — украинский; UI — копирование и просмотр на карточке заявки |
| 11.6 | Тарифы дорог | Несколько `TollTariffSet`; сценарий выбирает один набор; правила стран — внутри набора |
| 11.7 | Справочник стран | `country_reference`, seed Европы, API/UI **только чтение** в v1 |
| 11.8 | Регистр кодов стран | `codeAlpha2`, `codeAlpha3`, `country_code` — **только UPPERCASE** в БД, API и UI |
| 11.9 | Country breakdown | Тело `scenarioId` **опционально**: с ним — привязка NBU |
| 11.10 | Курсы на дату | Ближайший предыдущий полный снимок НБУ ≤ `calculationDate` |

## 12. Статус реализации v1 (2026-05-26)

### Backend
- [x] Flyway `V20`–`V23` (`country_reference`, toll/scenario tables, `freight_cost_calculations`, поля заявки/quote).
- [x] `GET /api/v1/admin/country-reference` (+ поиск).
- [x] CRUD `/api/v1/admin/freight-numeric-scenarios`, `/api/v1/admin/toll-tariff-sets` (+ country-toll-rules).
- [x] `NbuExchangeRateService.getRatesForDate`, `GET .../currencies/nbu-rates?rateDate=`.
- [x] `FreightCostCalculatorService`, `FreightCostCalculationSummaryBuilder`, `POST .../cost-preview`, история расчётов.
- [x] `POST .../country-breakdown` с `scenarioId`; инвалидация при смене сценария.
- [x] Quote: `fromCostCalculationId`, `freight_cost_calculation_id`, автокопирование `calculationSummary` → `internalNote`.
- [ ] PATCH для сценариев/тарифов (в ТЗ черновике; реализован PUT).

### Frontend
- [x] `/admin/freight-numeric-scenarios`, `/admin/toll-tariff-sets`, `/admin/country-reference`.
- [x] Секция NBU на `/admin/route-requests`.
- [x] `/admin/currencies` — дата снимка курсов.
- [ ] `nameUk` в таблице country breakdown на заявке (опционально).

### Тесты
- [x] `CountryReferenceApiIntegrationTest`.
- [x] `FreightCostCalculatorServiceTest` (+ summary builder).
- [x] `FreightNumericPricingApiIntegrationTest` (breakdown → preview → quote).
- [ ] Эталонный unit-тест с фиксированными суммами из файла правил (вне v1).

---
*Версия документа: 1.5. Расчёт фрахта через числовые сценарии и курсы НБУ.*
