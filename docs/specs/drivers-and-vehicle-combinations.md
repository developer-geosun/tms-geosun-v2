# Technical Specification / Техническое задание: Drivers & Vehicle Combinations

## Language Rules / Правила языка
- **Primary language / Основной язык:** RU
- **Secondary language / Дополнительный язык:** EN
- **Terms to keep in English / Термины, которые оставляем на английском:** soft-delete, RBAC, StoredFile, handset, Definition of Done

## 1) Goal / Цель
- **Problem / Проблема:** нет кадрового справочника водителей и именованных автопоездов; роль `DRIVER` на `User` недостаточна для назначения на рейс.
- **Value / Ценность:** ADMIN/MANAGER ведут карточки водителей (с документами и опциональным логином) и готовые связки тягач+полуприцеп.
- **Expected outcome / Ожидаемый результат:** API `/api/v1/admin/drivers`, `/api/v1/admin/vehicle-combinations` и admin UI.

## 2) Context / Контекст
- **Project/module:** `backend` reference + `frontend` admin pages.
- **Current behavior:** ТС в `vehicles`; роль `DRIVER` в users без профиля; автопоездов нет.
- **Related docs:** `vehicles-reference.md`, `file-storage.md`, `admin-user-management.md`.
- **Environment:** Java 21 / Spring Boot 3, Angular 21 + Material, Flyway, MySQL.

## 3) Scope (In)
- CRUD водителей + soft-delete/restore.
- Опциональная привязка к `User` (`USER`/`DRIVER`); lookup linkable users по email.
- Документы: паспорт и права, стороны FRONT/BACK, версии + StoredFile, compliance.
- CRUD автопоездов (tractor + trailer) + soft-delete/restore.
- UI `/admin/drivers`, `/admin/vehicle-combinations` (desktop + handset).

## 4) Out of Scope
- Invite / создание User админом.
- Медсправки, визы и прочие кадровые типы сверх паспорта/прав.
- Календарь занятости вне overlap-проверок рейсов (см. ТЗ trips).

## 5) User Stories
1. **Как** ADMIN/MANAGER, **я хочу** вести карточки водителей, **чтобы** назначать их на рейсы.
2. **Как** ADMIN/MANAGER, **я хочу** загружать сканы паспорта и прав, **чтобы** хранить комплект документов.
3. **Как** ADMIN/MANAGER, **я хочу** привязать учётку к водителю, **чтобы** он видел свои рейсы.
4. **Как** ADMIN/MANAGER, **я хочу** сохранять автопоезда, **чтобы** быстро выбирать состав на рейсе.

## 6) Functional Requirements
1. Доступ `/api/v1/admin/drivers/**` и `/api/v1/admin/vehicle-combinations/**` — `ADMIN`/`MANAGER`.
2. Водители: list `view=active|all|deleted`, get, create, update, soft-delete, restore.
3. Уникальность `license_number` среди неудалённых.
4. Link user: только `USER`/`DRIVER`; `USER` → `DRIVER`; один User — одна карточка.
5. Soft-delete водителя запрещён при назначении на активный рейс (`DRIVER_IN_ACTIVE_TRIP`).
6. Документы: типы `PASSPORT`/`DRIVER_LICENSE`, стороны `FRONT`/`BACK`; MIME jpeg/png/pdf ≤ 10 MB.
7. Compliance `OK`/`ATTENTION`/`PROBLEM`; статусы версии как у ТС (MISSING/EXPIRED/EXPIRING_SOON/VALID, порог 30 дней).
8. Автопоезда: tractor=`SEMI_TRACTOR`, trailer=`SEMI_TRAILER`; unique pair среди активных; soft-delete запрещён при активном рейсе.

## 7) Non-functional Requirements
- **Security:** кадровые сканы только ADMIN/MANAGER; водитель их не читает.
- **Performance:** list без пагинации для справочников (как vehicles) допустим для v1.
- **Reliability:** soft-delete идемпотентен.
- **UX:** Material, handset через `LayoutService`, i18n uk/en/ru.

## 8) Data Contracts and API

### Drivers
| Поле | Описание |
|------|----------|
| id | UUID |
| last_name, first_name, patronymic | ФИО |
| phone | телефон |
| license_number, license_categories, license_expires_on | права |
| user_id | optional FK users |
| comment | текст |
| is_deleted, deleted_at | soft delete |

### driver_documents
| Поле | Описание |
|------|----------|
| document_type | PASSPORT \| DRIVER_LICENSE |
| side | FRONT \| BACK |
| valid_from, valid_to | даты |
| stored_file_id | FK stored_files |

### Endpoints drivers
- `GET /api/v1/admin/drivers?view=`
- `GET/POST/PUT/DELETE /api/v1/admin/drivers[/{id}]`
- `POST /api/v1/admin/drivers/{id}/restore`
- `GET /api/v1/admin/drivers/linkable-users?email=`
- `PUT/DELETE /api/v1/admin/drivers/{id}/user`
- `GET /api/v1/admin/drivers/{id}/documents`
- `POST /api/v1/admin/drivers/{id}/documents/{type}/{side}`
- `GET /api/v1/admin/drivers/{id}/documents/{documentId}/file`
- `DELETE /api/v1/admin/drivers/{id}/documents/{documentId}`

### vehicle_combinations
- `GET/POST/PUT/DELETE /api/v1/admin/vehicle-combinations[/{id}]`
- `POST /api/v1/admin/vehicle-combinations/{id}/restore`
- Query `view=active|all|deleted`

### Errors
`LICENSE_ALREADY_EXISTS`, `DRIVER_DELETED`, `DRIVER_IN_ACTIVE_TRIP`, `USER_ROLE_NOT_LINKABLE`, `USER_ALREADY_LINKED`, `INVALID_VEHICLE_TYPE`, `COMBINATION_PAIR_EXISTS`, `COMBINATION_IN_ACTIVE_TRIP`, `NOT_FOUND`, `VALIDATION_ERROR`

## 9) UX/UI
- `/admin/drivers`, `/admin/vehicle-combinations`; меню для admin/manager.
- Документы в форме после create (как vehicles).
- Фильтр compliance в списке водителей.

## 10) Architecture
- Пакет `com.geosun.tms.reference` (+ driver/combination entities).
- Flyway V33+.
- StoredFile prefix `drivers/{id}/documents/...`.

## 11) Implementation Constraints
- Стек и соглашения проекта; без лишних зависимостей.

## 12) Implementation Plan
1. Миграции + entities.
2. Services/controllers + tests.
3. Frontend API + pages + i18n.

## 13) Acceptance Criteria
- [ ] CRUD водителей и документов работает для ADMIN/MANAGER.
- [ ] Привязка User и soft-delete/restore с заявленными кодами.
- [ ] CRUD автопоездов с проверкой типов и unique pair.
- [ ] UI desktop + handset, i18n.
- [ ] Tests + docs updated.

## 14) Test Plan
- Integration: RBAC, unique, documents upload, link user, combination types.
- Manual: create driver → docs → combination.

## 15) Risks and Assumptions
- **Assumption:** объём справочника водителей небольшой (list без server pagination в v1).
- **Risk:** soft-delete при активных рейсах — блокируем явно.
