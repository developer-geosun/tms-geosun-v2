# Справочник транспортных средств (ТС)

## Статус
Реализовано (v1).

## Цель
- Админ-справочник ТС с CRUD и мягким удалением.
- Сканы свидетельства о регистрации (лицевая / обратная) через общий слой `StoredFileService`.
- Роли: `ADMIN`, `MANAGER`.

## Зависимость
[`file-storage.md`](file-storage.md) — таблица `stored_files` и `StoredFileService`.

## Вне области (v1)
- Привязка ТС к маршрутам / заявкам.
- Справочник собственников / марок.
- Другие типы документов.

## Данные

### `vehicles` (Flyway `V31`)
| Поле | Описание |
|------|----------|
| `id` | UUID |
| `plate_number` | Госномер |
| `vin` | VIN (17 символов, без I/O/Q) |
| `make`, `model` | Марка и модель (текст) |
| `manufacture_year` | Год производства (`1950..currentYear+1`) |
| `owner` | Собственник (текст) |
| `registration_series`, `registration_number` | Серия и номер техпаспорта |
| `vehicle_type` | `SEMI_TRACTOR` \| `SEMI_TRAILER` |
| `is_deleted`, `deleted_at` | Soft delete |

Уникальность среди **неудалённых** (проверка в сервисе): госномер, VIN, пара серия+номер.

### `vehicle_registration_scans`
| Поле | Описание |
|------|----------|
| `vehicle_id` | FK → vehicles |
| `side` | `FRONT` \| `BACK` |
| `stored_file_id` | FK → stored_files |

Уникальность: `(vehicle_id, side)`. Soft delete ТС **не** удаляет сканы.

## API (`/api/v1/admin/vehicles`)

`@PreAuthorize("hasAnyRole('ADMIN','MANAGER')")`

| Метод | Путь | Действие |
|-------|------|----------|
| GET | `/?view=active\|all\|deleted` | Список (default `active`) |
| GET | `/{id}` | Карточка + метаданные сканов |
| POST | `/` | Создать |
| PUT | `/{id}` | Обновить (только неудалённые) |
| DELETE | `/{id}` | Soft delete |
| POST | `/{id}/restore` | Восстановить (409 при конфликте уникальности) |
| PUT | `/{id}/registration-certificate/{side}` | Upload/replace (`multipart` поле `file`; `side=front\|back`) |
| GET | `/{id}/registration-certificate/{side}` | Скачать/открыть |
| DELETE | `/{id}/registration-certificate/{side}` | Удалить скан |

Сканы: MIME `image/jpeg`, `image/png`, `application/pdf`; max 10 MB. Upload/replace/delete — только для активных ТС; GET — и для удалённых.

## Frontend
- `/admin/vehicles` — таблица + боковая форма, фильтр active/all/deleted.
- Сканы доступны после создания карточки.
- i18n: uk / ru / en.

## Ошибки
- `PLATE_ALREADY_EXISTS`, `VIN_ALREADY_EXISTS`, `REGISTRATION_ALREADY_EXISTS` — 409
- `VEHICLE_DELETED` — 409 при update/upload на удалённом
- `NOT_FOUND`, `VALIDATION_ERROR`
