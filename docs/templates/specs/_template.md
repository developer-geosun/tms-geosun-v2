# Technical Specification / Техническое задание: <Feature Name / Название фичи>

## Language Rules / Правила языка
- **Primary language / Основной язык:** <RU or EN>
- **Secondary language / Дополнительный язык:** <RU or EN>
- **Terms to keep in English / Термины, которые оставляем на английском:** `auth`, `access token`, `refresh token`, `scope`, `Definition of Done`

## 1) Goal / Цель
- **Problem / Проблема:** <what issue is solved / какую проблему решаем>
- **Value / Ценность:** <business/user value / что получит бизнес или пользователь>
- **Expected outcome / Ожидаемый результат:** <what changes after release / что изменится после релиза>

## 2) Context / Контекст
- **Project/module / Проект/модуль:** <where it is implemented / где реализуется>
- **Current behavior / Текущее поведение:** <how it works now / как работает сейчас>
- **Related docs / Связанные документы:** <ADR, API, mockups, tasks / ADR, API, макеты, задачи>
- **Environment constraints / Ограничения окружения:** <versions, infrastructure, external services / версии, инфраструктура, внешние сервисы>

## 3) Scope (In) / Scope (входит в задачу)
- <item 1 / пункт 1>
- <item 2 / пункт 2>
- <item 3 / пункт 3>

## 4) Out of Scope / Out of Scope (не входит)
- <explicitly excluded item / что явно не делаем в этой итерации>
- <additional limitation / дополнительное ограничение>

## 5) User Stories / Пользовательские сценарии
1. **As a / Как** <role>, **I want / я хочу** <action>, **so that / чтобы** <value>.
2. **As a / Как** <role>, **I want / я хочу** <action>, **so that / чтобы** <value>.

## 6) Functional Requirements / Функциональные требования
1. <requirement 1 / требование 1>
2. <requirement 2 / требование 2>
3. <requirement 3 / требование 3>

## 7) Non-functional Requirements / Нефункциональные требования
- **Security / Безопасность:** <requirements / требования>
- **Performance / Производительность:** <SLA/SLO, p95/p99>
- **Reliability / Надежность:** <retries, fault tolerance / ретраи, отказоустойчивость>
- **Logging/Monitoring / Логирование и мониторинг:** <events, metrics, alerts / события, метрики, алерты>
- **Accessibility/UX / Доступность и UX:** <a11y, localization, responsive / a11y, локализация, адаптив>

## 8) Data Contracts and API / Контракты данных и API
### 8.1 Input Data / Входные данные
- **Format / Формат:** <JSON/form/params / JSON/форма/параметры>
- **Validation / Валидация:** <rules / правила>

### 8.2 Output Data / Выходные данные
- **Format / Формат:** <JSON/UI state / JSON/UI состояние>
- **Errors / Ошибки:** <codes and messages / коды и тексты>

### 8.3 Endpoints (if any) / Эндпоинты (если есть)
- `METHOD /path` - <purpose / назначение>
- Request: <example / пример>
- Response: <example / пример>

## 9) UX/UI Requirements (frontend) / UX/UI требования (frontend)
- States / Состояния: `loading` / `empty` / `error` / `success`
- Form behavior / Поведение форм: <validation, hints / валидации, подсказки>
- Navigation / Навигация: <redirects, guards, breadcrumbs / редиректы, guard, breadcrumbs>
- UI texts / Тексты интерфейса: <key messages / ключевые сообщения>

## 10) Architecture Changes / Изменения в архитектуре
- **Components/services / Компоненты/сервисы:** <what to add/change / что добавляем или меняем>
- **Data storage / Хранилище данных:** <migrations, entities / миграции, сущности>
- **Integrations / Интеграции:** <external APIs, queues, webhooks / внешние API, очереди, webhooks>
- **Compatibility / Совместимость:** <backward compatibility, graceful degradation / обратная совместимость, деградация>

## 11) Implementation Constraints / Ограничения реализации
- Use existing stack and project conventions. / Использовать существующий стек и соглашения проекта.
- Do not add dependencies without rationale. / Не добавлять зависимости без обоснования.
- Do not change unrelated modules. / Не менять несвязанные модули.
- Preserve backward compatibility where required. / Сохранять обратную совместимость где требуется.

## 12) Implementation Plan / План реализации
1. <phase 1 / этап 1>
2. <phase 2 / этап 2>
3. <phase 3 / этап 3>

## 13) Acceptance Criteria (Definition of Done) / Критерии приемки
- [ ] <criterion 1 / критерий 1>
- [ ] <criterion 2 / критерий 2>
- [ ] <criterion 3 / критерий 3>
- [ ] Documentation updated / Документация обновлена.
- [ ] Tests added/updated and passing / Тесты добавлены или обновлены и проходят.

## 14) Test Plan / Тест-план
- **Unit:** <what is covered / что проверяем>
- **Integration:** <what is covered / что проверяем>
- **E2E/Manual:** <scenarios / сценарии>
- **Edge cases / Граничные случаи:** <list>

## 15) Risks and Assumptions / Риски и допущения
- **Risks / Риски:** <what may go wrong / что может пойти не так>
- **Assumptions / Допущения:** <what is assumed true / что считаем истинным>
- **Rollback plan / План отката:** <how to rollback / как откатить изменения>

## 16) Release Artifacts / Артефакты релиза
- PR: <link / ссылка>
- Version/tag / Версия/тег: <value>
- Release date / Дата релиза: <date>
- Owner / Ответственный: <name>

---

## Instructions for LLM / Инструкции для LLM
Use these rules when implementing this specification / Используй правила ниже при реализации по этому ТЗ:

1. Ask clarifying questions first if ambiguity exists. / Если есть неоднозначность, сначала задай уточняющие вопросы.
2. Stay within `Scope` and `Out of Scope`. / Не выходи за рамки `Scope` и `Out of Scope`.
3. Follow current architecture and project style. / Следуй текущей архитектуре и стилю проекта.
4. Show a brief plan before code changes. / Перед кодом покажи краткий план шагов.
5. After changes provide:
   - changed files list / список измененных файлов;
   - what changed and why / что и зачем изменено;
   - verification steps (commands + expected result) / как проверить;
   - risks and known gaps / риски и непокрытые случаи.
6. Do not add dependencies without explicit justification. / Не добавляй зависимости без явного обоснования.
7. Add short comments only for non-obvious logic. / Добавляй короткие комментарии только для неочевидной логики.

## Appendices (optional) / Приложения (опционально)
- Sequence diagrams / Диаграммы последовательностей
- Payload examples / Примеры payload
- Screenshots/mockups / Скриншоты и макеты
