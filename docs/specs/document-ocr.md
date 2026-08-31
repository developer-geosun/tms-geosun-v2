# Распознавание сканов документов (OCR / suggest)

## Статус
Спека, не реализовано. Целевой этап — после интеграции справочника видов документов с карточками ТС/водителей.

## Цель
- По скану документа и выбранному **виду документа** возвращать **предзаполненные значения полей** из `document_types.field_definitions`.
- **Human-in-the-loop:** сервис только *предлагает* значения (`suggest`), сохраняет их всегда пользователь. Автозапись в карточку ТС/водителя исключена.
- Провайдер распознавания — **сменяемый** (облачный VLM / офлайн MRZ / self-hosted), домен от него не зависит.
- Детерминированные источники (MRZ, контрольные суммы) имеют приоритет над вероятностными (LLM).

## Связанные документы
- [`document-types-reference.md`](document-types-reference.md) — источник `field_definitions`, `planned_scan_pages`, `country_code`.
- [`file-storage.md`](file-storage.md) — `StoredFileService`, лимит 10 MB, MIME.
- [`drivers-and-vehicle-combinations.md`](drivers-and-vehicle-combinations.md) — `driver_documents` (`side` = FRONT/BACK), сканы прав/паспортов.
- [`vehicles-reference.md`](vehicles-reference.md) — `vehicle_documents`, свидетельство о регистрации.
- [`auth-authentication-authorization.md`](auth-authentication-authorization.md) — RBAC, `ApiException`, коды ошибок.

## Вне области (v1)
- Автосохранение распознанных значений в `drivers` / `vehicles` без подтверждения человеком.
- Определение **вида** документа по скану (классификация). Вид выбирает пользователь.
- Проверка подлинности документа, liveness, NFC/RFID, сверка фото с лицом.
- Распознавание рукописного текста и документов не из справочника (CMR, TTN, инвойсы) — отдельный этап.
- Обучение собственных моделей, дообучение, аннотирование датасета.
- Пакетная обработка архивов (ZIP, многодокументные PDF со склейкой).

---

## Выбор провайдера

### Решение
**Основной провайдер v1 — мультимодальная LLM (Gemini Flash через Vertex AI, регион EU) со строгой JSON-схемой**, плюс **офлайн MRZ-парсер** как приоритетный источник для заграничного паспорта и ID-картки.

### Обоснование

| Вариант | Стоимость | Почему не основной |
|---------|-----------|--------------------|
| Tesseract / PaddleOCR (self-host) | только железо | Отдают текст, а не именованные поля; маппинг в `field_definitions` пришлось бы писать под каждый вид документа |
| Azure Document Intelligence / Google Document AI | ~$1.5 / 1000 стр (текст), ~$10–30 / 1000 стр (поля) | Prebuilt ID-модели натренированы на US/EU-документах; под UA-права и ІПН нужна custom-модель на каждый вид = обучение + хостинг процессора |
| AWS Textract Forms | $50–65 / 1000 стр | Дороже всех, выгоды под ID-документы нет |
| Regula / Klippa | по договору (sales-led) | Уровень «банк/погранконтроль»; оправдано, если появится требование проверки подлинности |
| **Gemini Flash (Vertex AI, EU)** | **~$0.002–0.01 / страница** | Выбран: новый вид документа = новая запись в справочнике, без обучения моделей |

**Smart Engines** из рассмотрения исключён (компания российского происхождения).

### Ограничения основного провайдера
- LLM **не даёт настоящих вероятностей** — self-reported `confidence` в ответе является подсказкой для UI, а решение о доверии принимает валидатор (regex / контрольная сумма / MRZ).
- Возможны галлюцинации в цифрах → все критичные поля (`innCode`, номера, даты) проходят обязательную валидацию, см. «Валидация».
- Зависимость от внешнего сервиса → при `provider=none` или ошибке провайдера форма работает как сейчас, вручную.

---

## Архитектура

```
AdminDocumentOcrController  (POST .../ocr-suggest)
  → DocumentOcrService            (оркестрация, кэш, аудит, rate limit)
      ├── DocumentTypeReferenceService   (field_definitions выбранного вида)
      ├── DocumentOcrProvider (interface)
      │     ├── MrzDocumentOcrProvider        (офлайн, детерминированный; приоритет)
      │     ├── GeminiDocumentOcrProvider     (Vertex AI, JSON schema)
      │     └── DisabledDocumentOcrProvider   (provider=none → 503)
      ├── DocumentFieldValidator         (regex, checksum, даты, нормализация)
      └── DocumentOcrRequestRepository   (аудит + кэш по sha256)
```

Новый модуль `com.geosun.tms.ocr` по образцу `com.geosun.tms.storage`: `api` / `service` / `client` / `config` / `dto` / `domain` / `repository`.

### Контракт провайдера

```java
/** Провайдер розпізнавання: отримує байти скана + опис полів, повертає значення полів. */
public interface DocumentOcrProvider {

  /** Код провайдера для аудиту та конфігурації: gemini | mrz | none. */
  @NonNull
  String code();

  /** Чи здатний провайдер обробити цей вид документа (напр. MRZ — лише закордонний паспорт). */
  boolean supports(@NonNull DocumentOcrRequestContext context);

  @NonNull
  DocumentOcrProviderResult extract(@NonNull DocumentOcrRequestContext context);
}
```

`DocumentOcrRequestContext` — вид документа (id, `countryCode`, `nameEn`), список `field_definitions`, страницы скана (`byte[]` + `contentType` + `side`).
`DocumentOcrProviderResult` — `Map<String, ExtractedField>`, использованная модель, `latencyMillis`, сырой ответ провайдера (для диагностики, не для БД).

### Порядок работы `DocumentOcrService`
1. Валидация входа: вид документа существует и не удалён; файлов не больше `planned_scan_pages` (при `0` — не больше `app.ocr.max-pages`); MIME из белого списка; суммарный размер ≤ 10 MB.
2. Считать SHA-256 всех страниц + `documentTypeId` → ключ кэша. Попадание в кэш и `status = SUCCESS` свежее `cache-ttl` → вернуть сохранённый результат, провайдера не вызывать.
3. Прогнать `MrzDocumentOcrProvider`, если `supports(context)`.
4. Прогнать основной провайдер по полям, которые MRZ не закрыл.
5. Слить результаты: значение из MRZ **перекрывает** значение из LLM при конфликте (`source = MRZ`).
6. Валидация и нормализация каждого поля → `valid`, `warning`.
7. Записать аудит, вернуть DTO.

---

## Данные

### `document_ocr_requests` (Flyway `V39__create_document_ocr_requests.sql`)

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | VARCHAR(36) | UUID PK |
| `document_type_id` | VARCHAR(36) | FK → `document_types.id` |
| `content_sha256` | CHAR(64) | Хэш конкатенации страниц; ключ кэша |
| `page_count` | INT | Число переданных страниц |
| `provider` | VARCHAR(32) | `gemini` / `mrz` / `gemini+mrz` |
| `model` | VARCHAR(64) | Идентификатор модели (для воспроизводимости) |
| `status` | VARCHAR(16) | `SUCCESS` / `PARTIAL` / `FAILED` |
| `error_code` | VARCHAR(64) | Код ошибки при `FAILED` |
| `latency_millis` | INT | Время вызова провайдера |
| `extracted_fields` | JSON | Результат (см. ниже) |
| `created_by_user_id` | VARCHAR(36) | Кто запустил распознавание |
| `created_at` | DATETIME(6) | Время запроса |

Индексы: `UNIQUE (content_sha256, document_type_id)` — кэш; `KEY (created_at)` — очистка; `KEY (created_by_user_id, created_at)` — rate limit и аудит.

**Байты скана в этой таблице не хранятся.** Скан живёт в `stored_files` только если пользователь сохранил документ штатным путём (`driver_documents` / `vehicle_documents`).

### `extracted_fields` (JSON)

```json
[
  {
    "key": "expiresOn",
    "value": "2031-04-18",
    "rawValue": "18.04.2031",
    "source": "MRZ",
    "confidence": 0.99,
    "valid": true,
    "warning": null
  }
]
```

- `source`: `MRZ` | `LLM` — показывается в UI, чтобы человек знал, чему верить.
- `value` — нормализованное значение в формате API (даты ISO, серии в верхнем регистре, пробелы вырезаны).
- `rawValue` — как было на документе; полезно при разборе спорных случаев.
- `valid` — результат `DocumentFieldValidator`, а не мнение модели.
- `warning` — код проблемы (`CHECKSUM_FAILED`, `PATTERN_MISMATCH`, `DATE_IN_PAST`, `NOT_FOUND`).

### Расширение `field_definitions` (опционально, обратно совместимо)

`document_types.field_definitions` — JSON, поэтому добавление ключей не требует миграции данных. Для качества распознавания предлагается три необязательных ключа:

| Ключ | Назначение |
|------|-----------|
| `valueType` | `string` \| `date` \| `integer` — управляет нормализацией и JSON-схемой для LLM |
| `pattern` | regex для валидации (`^[A-Z]{2}[0-9]{6}$` для заграна) |
| `ocrHint` | Подсказка модели, где искать поле («верхний правый угол, под словом Серія») |

Старые записи без этих ключей обрабатываются как `valueType = string` без валидации по шаблону. `DocumentTypeFieldDefinition` — record, поэтому добавление компонентов затрагивает конвертер `DocumentTypeFieldDefinitionsConverter` и форму справочника (шаг «Поля документа»).

---

## API

База: `/api/v1/admin/document-ocr` (константа в новом `OcrApiPaths`).
Доступ: `@PreAuthorize("hasRole('ADMIN')")` в v1. Расширение на `MANAGER` — после согласования, отдельным пунктом.

| Метод | Путь | Действие |
|-------|------|----------|
| POST | `/suggest` | Распознать скан, вернуть предложения по полям |
| GET | `/requests` | Аудит-лог запросов (фильтры `documentTypeId`, `status`, даты) |
| GET | `/provider-info` | `{ "provider": "gemini", "model": "...", "enabled": true }` |

### `POST /api/v1/admin/document-ocr/suggest`

`multipart/form-data`:

| Часть | Обяз. | Описание |
|-------|-------|----------|
| `documentTypeId` | да | UUID вида документа из справочника |
| `files` | да | 1..N страниц; порядок = порядок страниц |
| `sides` | нет | Параллельный список `FRONT` / `BACK` для многостраничных видов |

MIME: `image/jpeg`, `image/png`, `application/pdf`. Лимит — как в `file-storage` (10 MB на запрос).

Ответ `200`:

```json
{
  "documentTypeId": "c1000000-0000-4000-8000-000000000002",
  "provider": "gemini+mrz",
  "status": "PARTIAL",
  "fields": [
    { "key": "licenseNumber", "value": "ABC123456", "source": "LLM",
      "confidence": 0.94, "valid": true, "warning": null },
    { "key": "licenseCategories", "value": "B, C, CE", "source": "LLM",
      "confidence": 0.71, "valid": true, "warning": null },
    { "key": "licenseExpiresOn", "value": null, "source": "LLM",
      "confidence": 0.0, "valid": false, "warning": "NOT_FOUND" }
  ],
  "cached": false,
  "latencyMillis": 2840
}
```

`status = PARTIAL`, если хотя бы одно поле не распознано или не прошло валидацию. Это **не** ошибка: форма всё равно заполняется тем, что найдено.

### Коды ошибок (`ApiException`)

| HTTP | Код | Когда |
|------|-----|-------|
| 400 | `OCR_UNSUPPORTED_MEDIA_TYPE` | MIME вне белого списка |
| 400 | `OCR_TOO_MANY_PAGES` | Страниц больше `planned_scan_pages` / лимита |
| 404 | `DOCUMENT_TYPE_NOT_FOUND` | Вид документа отсутствует или удалён |
| 429 | `OCR_RATE_LIMITED` | Превышен лимит запросов пользователя |
| 503 | `OCR_PROVIDER_DISABLED` | `app.ocr.provider=none` или не задан ключ |
| 503 | `OCR_PROVIDER_ERROR` | Таймаут / ошибка провайдера (по образцу `NBU_API_ERROR`) |

---

## Промпт и JSON-схема

Схема ответа строится **из `field_definitions` в рантайме**, хардкода полей нет:

```java
// Схема відповіді збирається зі справочника, тому новий вид документа не потребує коду.
for (DocumentTypeFieldDefinition field : documentType.getFieldDefinitions()) {
  properties.put(field.key(), jsonSchemaFor(field));
}
```

Правила промпта:
- Язык документа — по `document_types.country_code` (для `UA` — украинский, латиница в MRZ).
- Требование: «если поля на скане нет — верни `null`, не угадывай». Это снижает галлюцинации сильнее, чем любые пост-проверки.
- Даты — строго ISO `yyyy-MM-dd`, приведение из `dd.MM.yyyy` делает модель, контролирует валидатор.
- `responseMimeType: application/json` + `responseSchema` — свободный текст в ответе запрещён.
- Персональные данные в промпт-логи не пишутся: логируется только `documentTypeId`, число страниц, латентность и коды ошибок.

---

## Валидация (`DocumentFieldValidator`)

| Вид документа | Поле | Проверка |
|---------------|------|----------|
| ІПН | `innCode` | 10 цифр + **контрольная сумма по алгоритму ДПСУ** |
| Закордонний паспорт | `passportNumber` | `^[A-Z]{2}[0-9]{6}$`, сверка с MRZ |
| Закордонний паспорт | `expiresOn` | ISO-дата, не в прошлом (иначе `warning = DATE_IN_PAST`, поле не блокируется) |
| Паспорт (ID-картка) | `documentNumber` | 9 цифр |
| Посвідчення водія | `licenseNumber` | непусто; при совпадении с активным водителем — `warning = DUPLICATE_LICENSE` |
| Посвідчення водія | `licenseCategories` | значения из известного набора (`A1..A, B1, B, C1, C, D1, D, BE, CE, DE, T`) |
| Свідоцтво про реєстрацію | `registrationSeries` | только буквы, верхний регистр |
| Свідоцтво про реєстрацію | `registrationNumber` | только цифры |
| Любой | `valueType = date` | парсится в `LocalDate`, иначе `value = null` + `PATTERN_MISMATCH` |

Валидатор **не отбрасывает** невалидное значение молча: оно возвращается с `valid = false`, чтобы человек увидел, что модель прочитала, и исправил вручную.

---

## Конфигурация

```yaml
app:
  ocr:
    provider: ${OCR_PROVIDER:none}            # none | gemini
    max-pages: ${OCR_MAX_PAGES:4}             # если planned_scan_pages = 0
    cache-ttl-seconds: ${OCR_CACHE_TTL_SECONDS:604800}
    retention-days: ${OCR_RETENTION_DAYS:90}  # очистка document_ocr_requests
    rate-limit:
      max-requests: ${OCR_RATE_LIMIT_MAX_REQUESTS:60}
      window-seconds: ${OCR_RATE_LIMIT_WINDOW_SECONDS:3600}
    gemini:
      project-id: ${OCR_GEMINI_PROJECT_ID:}
      location: ${OCR_GEMINI_LOCATION:europe-west4}
      model: ${OCR_GEMINI_MODEL:gemini-2.5-flash}
      timeout-millis: ${OCR_GEMINI_TIMEOUT_MILLIS:30000}
      max-retries: ${OCR_GEMINI_MAX_RETRIES:1}
      credentials-json: ${OCR_GEMINI_CREDENTIALS_JSON:}
```

- **По умолчанию `provider=none`** — фича выключена, поведение системы не меняется, интеграционные тесты не ходят в сеть.
- `location` только EU-регион (`europe-west4`), чтобы персональные данные не покидали ЕС.
- Свойства — `@ConfigurationProperties` по образцу `NbuExchangeRateProperties`; клиент — `RestTemplateBuilder` с таймаутами, как `NbuApiClient` / `HereRoutingClient`.
- Очистка `document_ocr_requests` по `retention-days` — в существующий scheduled-cleanup (`app.cleanup`).

---

## Персональные данные и безопасность

- Паспорт, ІПН, права — чувствительные ПДн. Требования к облачному провайдеру: **Vertex AI (не consumer-API)**, EU-регион, DPA, **обучение на данных отключено**, prompt-логирование отключено.
- Скан уходит провайдеру **в памяти**, не через публичный URL, и не попадает в `stored_files` до сохранения документа пользователем.
- В логах приложения — никаких значений полей и байтов: только `documentTypeId`, `provider`, `status`, `latencyMillis`, `error_code`.
- Аудит `document_ocr_requests` содержит извлечённые ПДн, поэтому: доступ только ADMIN, retention 90 дней, попадает в общий контур бэкапов MySQL.
- Fallback для требования полного on-prem: реализация `DocumentOcrProvider` над self-hosted PaddleOCR-VL (Apache-2.0) в docker-сайдкаре. Домен и API при этом не меняются — только значение `app.ocr.provider`.

## Стоимость (оценка)

При 500 сканов/мес × 2 страницы и `gemini-2.5-flash` — порядка **$2–10/мес**; кэш по SHA-256 убирает повторные вызовы при пересохранении формы. MRZ-путь бесплатен. Для сравнения: AWS Textract Forms на том же объёме — около $65/мес.

---

## Frontend

- В формах документов ТС и водителя — кнопка **«Розпізнати скан»** (`mat-stroked-button` + `mat-icon` `document_scanner`) рядом с загрузкой файла.
- Диалог результата на Angular Material: `mat-list` полей, `mat-chip` с источником (`MRZ` / `LLM`), `mat-progress-bar` во время запроса, невалидные поля — `warn`-цветом с `mat-hint` из `warning`.
- Кнопка **«Заповнити форму»** переносит только выбранные чекбоксами поля; ничего не сохраняется без явного submit самой формы.
- Кнопка скрыта, если `GET /provider-info` вернул `enabled: false`.
- i18n: ключи для uk / en / ru, как в остальных admin-страницах (`frontend/src/app/pages/admin-document-types` — образец структуры).

---

## План реализации

1. Модуль `com.geosun.tms.ocr`: `DocumentOcrProvider`, DTO, `DisabledDocumentOcrProvider`, `provider-info`, конфиг-проперти. Фича выключена.
2. Flyway `V39__create_document_ocr_requests.sql` + entity/repository + аудит.
3. `MrzDocumentOcrProvider` (офлайн, без сети) + `DocumentFieldValidator` с контрольными суммами MRZ и ІПН.
4. `GeminiDocumentOcrProvider`: Vertex AI, генерация JSON-схемы из `field_definitions`, таймауты, ретрай, маппинг ошибок в `OCR_PROVIDER_ERROR`.
5. `POST /suggest` + кэш по SHA-256 + rate limit + `GET /requests`.
6. Опциональные ключи `valueType` / `pattern` / `ocrHint` в `field_definitions` и в форме справочника.
7. Frontend: диалог распознавания в формах документов ТС/водителя.
8. Очистка аудита по `retention-days` в существующем cleanup-джобе.

## Критерии приёмки

- [ ] `app.ocr.provider=none` (по умолчанию) → `POST /suggest` отдаёт `503 OCR_PROVIDER_DISABLED`, остальная система не затронута.
- [ ] Скан заграничного паспорта: `passportNumber`, `expiresOn`, `issuedOn` берутся из MRZ, `source = MRZ`, без вызова облака.
- [ ] Скан ІПН с испорченной цифрой → поле возвращается с `valid = false`, `warning = CHECKSUM_FAILED`, а не сохраняется молча.
- [ ] Повторный запрос того же файла и вида → `cached: true`, вызова провайдера нет.
- [ ] Новый вид документа, созданный через `/admin/document-types`, распознаётся **без изменений в коде**.
- [ ] MANAGER / USER → `403`.
- [ ] В логах при успешном и при неуспешном распознавании нет значений полей документа.
- [ ] Ни один результат распознавания не попадает в `drivers` / `vehicles` без submit формы пользователем.

## Test plan

- Unit: `DocumentFieldValidator` — контрольная сумма ІПН (валидная/битая), check digits MRZ, нормализация дат `dd.MM.yyyy` → ISO, серия/номер свидетельства.
- Unit: генерация JSON-схемы из `field_definitions` (включая записи без `valueType`).
- Unit: `MrzDocumentOcrProvider` на фикстурах строк MRZ (TD1 и TD3).
- Integration `DocumentOcrApiIntegrationTest`: RBAC (`ADMIN` / `MANAGER` / `USER`), `provider=none` → 503, невалидный MIME → 400, лишние страницы → 400, rate limit → 429, кэш-хит по SHA-256. Провайдер — тестовый stub-бин, **сеть в тестах не используется**.
- Integration: слияние результатов — MRZ перекрывает LLM при конфликте значений.
- Manual: по одному реальному скану каждого из пяти видов справочника (UA), сверка полей глазами; фиксация точности в этом файле после прогона.
