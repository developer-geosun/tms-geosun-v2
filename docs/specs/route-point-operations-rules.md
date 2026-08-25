# Единая спецификация правил операций точек маршрута

## 1) Назначение
- Этот документ фиксирует единые правила операций на точках маршрута для `frontend` и `backend`.
- Документ должен использоваться как источник истины при изменении валидации, UI-ограничений и серверных проверок.

## 2) Термины
- `LOADING` - загрузка.
- `UNLOADING` - выгрузка.
- `EXPORT_CUSTOMS` - затамаживание.
- `IMPORT_CUSTOMS` - растамаживание.
- `BORDER point` - точка с `isBorder = true`.
- `Non-border point` - точка с `isBorder = false`.

## 3) Локальные правила для одной точки

### 3.1 Максимум операций на точку
- На одной точке разрешено не более `3` операций.

### 3.2 Разрешенные наборы для non-border точки
- `[]`
- `[LOADING]`
- `[EXPORT_CUSTOMS]`
- `[IMPORT_CUSTOMS]`
- `[UNLOADING]`
- `[LOADING, EXPORT_CUSTOMS]`
- `[UNLOADING, EXPORT_CUSTOMS]`
- `[LOADING, UNLOADING]`
- `[IMPORT_CUSTOMS, UNLOADING]`
- `[LOADING, EXPORT_CUSTOMS, UNLOADING]`

### 3.3 Разрешенные наборы для border точки
- `[]`
- `[EXPORT_CUSTOMS]`
- `[IMPORT_CUSTOMS]`
- `[EXPORT_CUSTOMS, IMPORT_CUSTOMS]`

### 3.4 Правила доступности операций в UI (чекбоксы)
- На первой точке маршрута `UNLOADING` должен быть недоступен в UI.
- На последней точке маршрута `LOADING` должен быть недоступен в UI.
- Итоговая корректность маршрута по-прежнему проверяется общей валидацией из раздела 4.
- При сравнении наборов операций дубликаты должны игнорироваться (операции трактуются как множество).

## 4) Глобальные правила по маршруту

### 4.1 Общие ограничения
- В маршруте допускается максимум `1` border-точка.
- В маршруте должна быть минимум `1` точка с `LOADING`.
- В маршруте должна быть минимум `1` точка с `UNLOADING`.
- Первая выгрузка не может быть раньше первой загрузки.
- После последней загрузки должна существовать выгрузка на этой же или более поздней точке.

### 4.2 Правила таможенных операций
- Если border-точки нет, любые таможенные операции (`EXPORT_CUSTOMS`, `IMPORT_CUSTOMS`) запрещены.
- Если border-точка есть:
  - `EXPORT_CUSTOMS` допускается только в диапазоне от первой `LOADING` до border-точки включительно.
  - `IMPORT_CUSTOMS` допускается только на border-точке или после нее.
  - По маршруту допускается не более одной точки с `EXPORT_CUSTOMS`.
  - По маршруту допускается не более одной точки с `IMPORT_CUSTOMS`.
  - Должен существовать `EXPORT_CUSTOMS` до/на border-точке.
  - Должен существовать `IMPORT_CUSTOMS` на/после border-точки.

### 4.3 Фазовая модель транзита
- Фаза `LOAD_PHASE`:
  - `IMPORT_CUSTOMS` без `EXPORT_CUSTOMS` недопустим.
  - При появлении `EXPORT_CUSTOMS` без `IMPORT_CUSTOMS` маршрут переходит в фазу `CUSTOMS_TRANSIT`.
- Фаза `CUSTOMS_TRANSIT`:
  - Запрещены `LOADING`.
  - Запрещены `EXPORT_CUSTOMS`.
  - Запрещены `UNLOADING`, если на той же точке нет `IMPORT_CUSTOMS`.
  - При появлении `IMPORT_CUSTOMS` маршрут возвращается в фазу `LOAD_PHASE`.
- Если маршрут заканчивается в фазе `CUSTOMS_TRANSIT`, это ошибка незакрытой таможни.

## 5) Коды валидации
- `OPERATION_SET_INVALID`
- `BORDER_TOO_MANY`
- `CUSTOMS_WITHOUT_BORDER`
- `LOADING_REQUIRED`
- `UNLOADING_REQUIRED`
- `UNLOADING_BEFORE_LOADING`
- `UNLOADING_REQUIRED_AFTER_LAST_LOADING`
- `EXPORT_TOO_MANY`
- `IMPORT_TOO_MANY`
- `MISSING_EXPORT_BEFORE_BORDER`
- `MISSING_IMPORT_AFTER_BORDER`
- `IMPORT_BEFORE_EXPORT`
- `OPERATION_IN_TRANSIT`
- `UNCLOSED_CUSTOMS`

## 6) Текущее место реализации
- Frontend-валидация: `frontend/src/app/pages/route-builder/route-point-operations.utils.ts`.
- Frontend тесты: `frontend/src/app/pages/route-builder/route-point-operations.utils.spec.ts`.

## 7) Правило сопровождения изменений
- Любое изменение правил операций должно включать:
  - обновление этого документа;
  - обновление frontend-валидации и тестов;
  - синхронное обновление backend-валидации и API-контрактов.
