# Technical Specification / Техническое задание: Trips & Driver Expense Reports

## Language Rules / Правила языка
- **Primary language / Основной язык:** RU
- **Secondary language / Дополнительный язык:** EN
- **Terms to keep in English / Термины, которые оставляем на английском:** soft-delete, RBAC, StoredFile, handset, Definition of Done

## 1) Goal / Цель
- **Problem / Проблема:** нет операционного учёта рейсов (исполнение перевозки), назначения водителя/автопоезда и фактических затрат водителя.
- **Value / Ценность:** менеджер планирует и ведёт рейсы; водитель (или менеджер) сдаёт отчёт по затратам с чеками.
- **Expected outcome / Ожидаемый результат:** `/api/v1/admin/trips`, `/api/v1/my/trips` и UI `/admin/trips`, `/my-trips`.

## 2) Context / Контекст
- **Related:** `drivers-and-vehicle-combinations.md`, `routes-server-workflow-and-freight-quoting.md`.
- **Note:** `FreightCostCalculation` — плановая оценка заявки; **не** смешивать с фактическим expense report.

## 3) Scope (In)
- Независимый рейс с опциональной ссылкой на `RouteRequest`.
- Назначение водителя и состава (связка или ручной tractor+trailer).
- Статусы рейса: DRAFT → PLANNED → IN_PROGRESS → COMPLETED; CANCELLED.
- Soft-delete рейса.
- Expense report 1:1 с рейсом; строки затрат + чеки; submit / approve / reject / reopen.
- Driver API только для своих рейсов (через `driver.user_id`).

## 4) Out of Scope
- Сверка с FreightCostCalculation / влияние на quote.
- Два водителя, одиночный грузовик, GPS.
- Начисление ЗП по отчёту.

## 5) User Stories
1. **Как** MANAGER, **я хочу** создать рейс и назначить водителя/состав, **чтобы** выполнить перевозку.
2. **Как** DRIVER, **я хочу** видеть свои рейсы и сдавать отчёт по затратам, **чтобы** зафиксировать расходы.
3. **Как** MANAGER, **я хочу** утверждать или отклонять отчёт, **чтобы** контролировать затраты.

## 6) Functional Requirements
1. Admin trips CRUD + `PATCH /{id}/status`; list с пагинацией и фильтрами.
2. `DRAFT→PLANNED`: обязательны driver, tractor, trailer, planned dates; license not expired; no resource overlap; soft-deleted refs forbidden.
3. После `IN_PROGRESS` — lock состава/водителя (`TRIP_LOCKED`).
4. Один `route_request_id` — максимум один рейс (`REQUEST_ALREADY_HAS_TRIP`).
5. Auto-create expense report `DRAFT` при create trip.
6. Driver edits lines when report DRAFT/REJECTED and trip IN_PROGRESS|COMPLETED; submit; no edit after SUBMITTED/APPROVED.
7. Manager: edit any, approve/reject/reopen; если нет логина у водителя — менеджер ведёт отчёт.
8. Expense categories: FUEL, TOLL, PER_DIEM, PARKING, REPAIR, OTHER.

## 7) Non-functional
- Security: driver isolation by linked user; receipts via StoredFile prefix `trip-expenses/`.
- Soft-delete идемпотентен.

## 8) Data / API

### trips
`trip_number`, `status`, optional `route_request_id`, title/comment, origin/destination text, planned/actual dates, `driver_id`, optional `combination_id`, `tractor_id`, `trailer_id`, snapshots (driver_name, plates), soft delete.

### trip_expense_reports / trip_expense_lines
Report statuses: DRAFT, SUBMITTED, APPROVED, REJECTED.  
Lines: category, amount, currency_code, expense_date, description, optional stored_file_id.

### Admin
- `/api/v1/admin/trips` — list/get/create/update/delete/restore, `PATCH /{id}/status`
- `/api/v1/admin/trips/{id}/expense-report` — get, put lines, receipts, submit, review, reopen

### Driver
- `/api/v1/my/trips` — list/get
- `/api/v1/my/trips/{id}/expense-report` — get, put lines, receipts, submit

### Errors
`TRIP_LOCKED`, `RESOURCE_OVERLAP`, `LICENSE_EXPIRED`, `REQUEST_ALREADY_HAS_TRIP`, `INVALID_STATUS_TRANSITION`, `EXPENSE_REPORT_LOCKED`, `NOT_FOUND`, `FORBIDDEN`, `VALIDATION_ERROR`

## 9) UX/UI
- `/admin/trips`, `/admin/trips/:id`, `/my-trips` (role driver).
- Блок отчёта на карточке: строки, итоги, чеки, кнопки workflow.

## 10) Architecture
- Пакет `com.geosun.tms.trips`.
- Flyway после drivers/combinations.

## 13) Acceptance Criteria
- [ ] Рейсы создаются с/без заявки; назначение состава работает (catalog + override).
- [ ] Overlap и license checks.
- [ ] Expense workflow driver vs manager.
- [ ] Tests + system.md updated.
