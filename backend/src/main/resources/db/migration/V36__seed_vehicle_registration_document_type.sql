-- Дефолтний вид документа: свідоцтво про реєстрацію ТС (Україна).
INSERT IGNORE INTO document_types (
    id,
    name_uk,
    name_en,
    name_ru,
    country_code,
    planned_scan_pages,
    field_definitions,
    is_deleted,
    deleted_at,
    created_at,
    updated_at
) VALUES (
    'c1000000-0000-4000-8000-000000000001',
    'Свідоцтво про реєстрацію',
    'Registration certificate',
    'Свидетельство о регистрации',
    'UA',
    2,
    JSON_ARRAY(
        JSON_OBJECT(
            'key', 'registrationSeries',
            'nameUk', 'Серія свідоцтва',
            'nameEn', 'Registration series',
            'nameRu', 'Серия свидетельства'
        ),
        JSON_OBJECT(
            'key', 'registrationNumber',
            'nameUk', 'Номер свідоцтва',
            'nameEn', 'Registration number',
            'nameRu', 'Номер свидетельства'
        )
    ),
    FALSE,
    NULL,
    CURRENT_TIMESTAMP(6),
    CURRENT_TIMESTAMP(6)
);
