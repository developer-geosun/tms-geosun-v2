# Правила расчёта себестоимости рейса (детерминированный калькулятор)

> **Назначение:** серверный расчёт без ИИ; **источник истины по формулам** для [`freight-cost-scenario-nbu-pricing.md`](./freight-cost-scenario-nbu-pricing.md) (курсы НБУ из БД, country breakdown, `cost-preview` / quote).
>
> **Пресет v1** (первый детерминированный вариант; параметры задаёт ADMIN/MANAGER в сценарии): топливо **81,50 UAH/л**, маржа **30%**, ЗП **15%** от итогового фрахта, гружёный **38** / **40** л/100 км. Другие пресеты — отдельные файлы правил по мере появления.

## Входные данные


| Источник          | Поле / сущность                                                                                       |
| ----------------- | ----------------------------------------------------------------------------------------------------- |
| Маршрут заявки    | `Route` snapshot: `L_total_km`, `L_empty_km`, `L_loaded_km` (см. § «Длины маршрута» ниже)            |
| Пробег по странам | `route_country_distances` после `country-breakdown` с выбранным `scenarioId`                          |
| Сценарий          | `FreightCalculationScenario`: цена топлива, % ЗП, % маржи, суточные, сезон                            |
| Курсы             | `currency_nbu_rates` на `calculationDate`; при отсутствии — `422 NBU_RATES_NOT_AVAILABLE_FOR_DATE`    |
| Заявка            | `preferredStartDate` → сезон `WINTER` / `NON_WINTER` (декабрь–февраль = зима) при `seasonMode = AUTO` |


`RouteRequest.comment` не влияет на формулы. При отсутствии breakdown дорог по странам — расчёт не выполняется (ТЗ §3.1), а не оценка «на глаз».

## Длины маршрута

- **`L_total_km`**: полная длина snapshot маршрута заявки.
- **`L_empty_km`**: от старта маршрута (первая точка) до **первой** точки с операцией `LOADING` по полилинии.
- **`L_loaded_km`**: от первой `LOADING` до конца; при нескольких погрузках весь путь после первой `LOADING` — гружёный.

## Топливо


| Параметр                 | Значение                          |
| ------------------------ | --------------------------------- |
| Расход порожний          | 35 л/100 км                       |
| Расход гружёный, не зима | 38 л/100 км                       |
| Расход гружёный, зима    | 40 л/100 км                       |
| Цена топлива             | 81,50 UAH/л (`fuelPricePerLiter`) |


```
Fuel_empty  = L_empty_km / 100 × 35
Fuel_loaded = L_loaded_km / 100 × fuelConsumptionLoaded(season)
Fuel_cost_UAH = (Fuel_empty + Fuel_loaded) × fuelPricePerLiter
```

Если в сценарии нет разбивки по точкам `LOADING`, допустим fallback v1: `L_empty_km = 0,15 × L_total_km`, `L_loaded_km = 0,85 × L_total_km` — фиксировать в breakdown как допущение.

## Суточные (USD)


| Параметр     | Значение                     |
| ------------ | ---------------------------- |
| Ставка       | 10 EUR/день                  |
| Формула дней | `ceil(L_total_km / 600) + 2` |


```
PerDiem_EUR = days × 10
```

Конвертация в UAH — курс НБУ EUR на `calculationDate`.

## Дороги (EU)

По км из country breakdown; справочник `CountryTollRule` **набора**, привязанного к сценарию (`tollTariffSetId`; см. ТЗ §5.1):


| countryCode (UPPERCASE) | тип      | ставка                    |
| ----------- | -------- | ------------------------- |
| PL          | EUR/km   | 0,12                      |
| DE          | EUR/km   | 0,15                      |
| CZ          | EUR/km   | 0,10                      |
| SK          | EUR/km   | 0,09                      |
| AT          | EUR/день | 8 × **2 суток** (не × км) |
| HU          | EUR/km   | 0,11                      |
| RO          | EUR/km   | 0,08                      |
| прочие EU   | EUR/km   | 0,10                      |


```
Toll_country = toll_eur_per_km × km_in_country   ИЛИ   toll_eur_per_day × 2
```

## Прямые затраты

```
DirectCost = Fuel_cost_UAH + PerDiem_UAH + Tolls_UAH
```

(все статьи приведены к UAH через курсы НБУ на `calculationDate`).

## Зарплата водителя, маржа, итог

База: `DriverSalaryBasis.PERCENT_OF_FINAL_FREIGHT`, **p = 0,15**, **m = 0,30**.

Обозначения: **C** = `DirectCost`; **S** = себестоимость до маржи = C + ЗП; **T** = итоговый фрахт (quote); **F** = T.

**Маржа (`PERCENT_OF_COST_BEFORE_MARGIN`):**

```
DriverCost = p × T
S = C + DriverCost
Margin = m × S
T = S + Margin
```

Закрытая форма (проверка знаменателя > 0):

```
T = C × (1 + m) / (1 − p × (1 + m))
```

При m = 0,30 и p = 0,15: `T = 1,30 × C / 0,805`. Далее `DriverCost = p × T`, `Margin = 0,30 × S`, контроль `T = S + Margin`.

**Маржа (`FIXED_PER_TRIP`):** `marginFixedAmount` задаётся в **валюте предложения** (`proposalCurrency`) на рейс; в UAH пересчитывается курсом НБУ на `calculationDate`.

```
M_uah = marginFixedAmount × ratePerUnit(proposalCurrency)
Margin = M_uah
DriverCost ≈ p × T   (ЗП от итогового фрахта)
S = C + DriverCost
T = S + M_uah
```

Закрытая форма (p < 1):

```
T = (C + M_uah) / (1 − p)
```

Контроль: `S = T − M_uah`, `DriverCost = S − C`, `T = S + M_uah`.

Альтернатива в коде: итерация 2–5 шагов до `|Tₙ − Tₙ₋₁| < ε` (если закрытая форма не применима).

**Типы (код):** `DriverSalaryBasis.PERCENT_OF_FINAL_FREIGHT`; `marginType` = `PERCENT_OF_COST_BEFORE_MARGIN` или `FIXED_PER_TRIP`.

## Валюта предложения

- Внутренний учёт статей: **UAH**.
- Клиенту: **EUR** (`proposalCurrency`), пересчёт через кросс-курс НБУ.
- Округление денежных сумм: **2 знака** после запятой (HALF_UP или политика проекта).

## Аудит (breakdown)

Сохранять: `scenario_id`, снимок параметров, `calculationDate`, `season_used`, `L_empty_km`, `L_loaded_km`, `L_total_km`, курсы НБУ, суммы по статьям, `DirectCost`, `DriverCost`, `costBeforeMargin`, `Margin`, `total`, `driverSalaryBasis`, число итераций (если были).

**Текстовое описание:** поле `calculationSummary` — человекочитаемый отчёт по блокам (см. [`freight-cost-scenario-nbu-pricing.md`](./freight-cost-scenario-nbu-pricing.md) §7.1); числа в тексте должны совпадать с JSON breakdown.