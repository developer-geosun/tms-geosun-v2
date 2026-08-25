# Хранение файлов (file storage)

## Статус
Реализовано (v1).

## Цель
- Общий слой хранения бинарных файлов для backend.
- Метаданные в MySQL (`stored_files`), байты — на диске или в S3/MinIO.
- Выбор бэкенда при запуске: `app.storage.type=local|s3`.
- ADMIN-only тестовая страница и API для ручной проверки (не для бизнес-документов).

## Вне области (v1)
- CDN, virus scan, image resize.
- Автомиграция файлов при смене `local` ↔ `s3`.
- Полноценный файловый менеджер с папками/ACL.
- Доменные документы ТС (следующий план — справочник ТС).

## Данные

### `stored_files`
| Поле | Описание |
|------|----------|
| `id` | UUID PK |
| `storage_key` | Логический ключ (путь на диске / object key в S3), UNIQUE |
| `original_filename` | Имя при загрузке |
| `content_type` | MIME |
| `size_bytes` | Размер |
| `created_at` | Время создания |
| `created_by_user_id` | Кто загрузил (опционально) |

Миграция: Flyway `V30__create_stored_files.sql`.

## Архитектура

```
Domain (ТС / admin test)
  → StoredFileService (метаданные + оркестрация)
    → StorageService (interface)
         ├── LocalDiskStorageService
         └── S3StorageService (AWS SDK v2, совместим с MinIO)
```

Имена объектов на хранилище: `{relativeDir}/{uuid}{ext}`.  
Тестовые загрузки: префикс `admin-test/`.

## Конфигурация

```yaml
spring:
  servlet:
    multipart:
      max-file-size: 10MB
      max-request-size: 10MB
app:
  storage:
    type: ${APP_STORAGE_TYPE:local}   # local | s3
    local:
      base-path: ${APP_STORAGE_LOCAL_BASE_PATH:./data/uploads}
    s3:
      endpoint: ${APP_STORAGE_S3_ENDPOINT:}
      region: ${APP_STORAGE_S3_REGION:us-east-1}
      bucket: ${APP_STORAGE_S3_BUCKET:tms-uploads}
      access-key: ${APP_STORAGE_S3_ACCESS_KEY:}
      secret-key: ${APP_STORAGE_S3_SECRET_KEY:}
      path-style-access: ${APP_STORAGE_S3_PATH_STYLE:true}
```

### Примеры запуска
- Локально без MinIO: `APP_STORAGE_TYPE=local` (по умолчанию).
- Compose + MinIO: `APP_STORAGE_TYPE=s3`, endpoint `http://minio:9000`, ключи MinIO.
- Прод AWS: `APP_STORAGE_TYPE=s3`, пустой endpoint, реальные credentials/bucket/region.

**Важно:** смена `type` на уже заполненной БД **не** переносит байты. Нужна отдельная миграция объектов с сохранением тех же `storage_key`.

### Docker
- Volume `backend_uploads` → `/data/uploads` для режима `local`.
- Сервисы `minio` + `minio-init` (создание bucket) для режима `s3`.

## API (только ADMIN)

База: `/api/v1/admin/stored-files`

| Метод | Путь | Действие |
|-------|------|----------|
| GET | `/storage-info` | `{ "type": "local" \| "s3" }` |
| GET | `/` | список метаданных |
| POST | `/` | upload `multipart/form-data` поле `file` (любой тип ≤ 10 MB) |
| GET | `/{id}` | скачать содержимое |
| DELETE | `/{id}` | удалить байты + запись |

MANAGER / USER → `403`.

## Frontend
- `/admin/file-storage-test` — тестовая страница (роль ADMIN).
- Пункт меню «Файлы (тест)» / «Files (test)».

## Как подключать домен
1. Вызвать `StoredFileService.storeMultipart(file, "vehicles/{id}/registration", userId)`.
2. Сохранить `stored_files.id` в доменной таблице (FK).
3. Отдавать файл через `StoredFileService.open(id)`.
4. При удалении доменной привязки — `StoredFileService.delete(id)`.

Домен **не** обращается к `Files` / AWS SDK напрямую.

## Бэкапы
При `local` бэкапить каталог uploads вместе с MySQL.  
При `s3` — политики bucket / lifecycle провайдера.
