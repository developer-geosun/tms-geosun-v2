# Release Notes: Routes/Requests/Quotes Rollout

## Scope

Этот релиз закрывает rollout фич маршрутов и фрахтовых предложений по фазам 1-3 и фиксирует сквозные действия из пункта 5.1.

## Backend

- Добавлен модуль `routes` с endpoint-ами сохранения, просмотра и удаления маршрутов пользователя.
- Добавлен модуль `route-requests` с созданием заявок, user-историей и admin-очередью.
- Добавлен модуль `quotes` с созданием draft, отправкой quote и историей quote по заявке.
- Включена idempotency обработка для create/send операций quote через `Idempotency-Key`.
- Введены миграции Flyway `V3`, `V4`, `V5` для схем маршрутов, заявок и офферов.

## Frontend

- Исторически: `freight-calculation` и `routes-history` переводили flow на backend; в текущей кодовой базе эти SPA-страницы удалены — актуальные маршруты: `/route-builder`, `/routes`, заявки: `/my-freight-requests`.
- Добавлена admin-страница `admin/route-requests` для обработки заявок и quote workflow.
- Контракты backend API вынесены в typed-модели и сервисы (`routes`, `route-requests`, `quotes`).

## Security and Compatibility

- User ownership применяется к пользовательским данным маршрутов и заявок.
- RBAC для admin API: `ADMIN`/`MANAGER` на просмотр заявок, `ADMIN` на операции создания/отправки quote.
- Старый submit в GAS исключен из активного flow, backend API является единственным источником для заявок.

## Testing

- Backend integration покрытие включает:
  - маршруты: CRUD + ownership + `401`;
  - заявки/оферы: lifecycle, RBAC, idempotency и чтение `currentQuote` пользователем.
- Frontend unit покрытие дополнено тестами API-сервисов:
  - `RoutesApiService`;
  - `RouteRequestsApiService` (включая query params и idempotency headers).

## Documentation

- Обновлен `docs/system.md` с актуальной архитектурной картиной, API и правилами совместимости rollout.
