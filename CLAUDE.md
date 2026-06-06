# CLAUDE.md

Контекст для AI-агента, работающего в этом репозитории.

## Что это за проект

Учебный проект Hexlet «Календарь звонков» (курс «AI for Developers», project-386). Подход — **Design First**: сначала фиксируем API-контракт в TypeSpec, затем независимо реализуем фронтенд и бэкенд по этому контракту. Курс предполагает, что код пишется через AI-агентов с минимумом ручного программирования.

Проект сдаётся пошагово (~6 шагов + проверка) через push в `main`; CI `hexlet-check.yml` валидирует деливерабл каждого шага.

## Домен (по контракту v1.2.0)

Сервис похож на Calendly:

- **Один заранее заданный владелец календаря** (`model Owner`). Регистрации/авторизации нет — владелец предзаполнен.
- **Гости** анонимны: смотрят список типов событий, выбирают слот в 14-дневном окне, бронируют. Аккаунтов не создают.
- **Типы событий** (`EventType`) — id (задаётся владельцем явно), title, description, durationInMinutes.
- **Слоты** (`Slot`) генерируются на 14 дней от текущего момента; статусы: `available` / `booked` / `past` / `outside_window`.
- **Бронирование** (`Booking`): гость отправляет `BookingRequest` (eventTypeId + startTime + guestName/Email + notes), получает `GuestBookingConfirmation` с названием типа события и длительностью, чтобы экран успеха не делал второй запрос.
- **Админка владельца** (`/admin/...`): создание `EventType`, список предстоящих встреч в обогащённом виде (`AdminBooking[]` с `eventTypeTitle` и `durationInMinutes`).

### Жёсткие правила

- Один и тот же временной слот **нельзя забронировать дважды**, даже под разные `EventType` (`SLOT_ALREADY_BOOKED` 409, статус слота `booked`).
- Окно записи — ровно 14 дней от текущего момента. За пределами окна слотов не существует / они помечены `outside_window`.
- Все времена в API — `utcDateTime`; человеческое представление формирует фронт по `Owner.timeZone`.

## Структура репозитория

```
├── .github/workflows/hexlet-check.yml      # CI от Hexlet — НЕ ПРАВИТЬ
├── .claude/launch.json                     # конфиг preview-MCP (prism-mock + frontend)
├── spec/
│   ├── main.tsp                            # TypeSpec API-контракт (источник правды)
│   ├── tspconfig.yaml                      # emitter @typespec/openapi3
│   ├── package.json                        # scripts: compile, mock
│   └── tsp-output/@typespec/openapi3/      # сгенерированный openapi.yaml (gitignored)
├── frontend/                               # Vite + React + TS + shadcn/ui
│   ├── src/
│   │   ├── api/{schema.ts,client.ts,queries.ts}
│   │   ├── components/{ui,OwnerHeader,EventTypeCard,SlotGrid,SlotLegend,BookingsTable,EventTypeCreateForm,AppShell}.tsx
│   │   ├── routes/{EventTypesListPage,SlotPickerPage,BookingFormPage,BookingSuccessPage,AdminPage,NotFoundPage}.tsx
│   │   └── lib/{time.ts,utils.ts}
│   └── package.json                        # scripts: dev, build, gen:api
├── backend/                                # Node.js + TypeScript + Fastify (in-memory)
│   ├── src/{server,app,service,store,seed,clock,errors,slots,bookings,eventTypes}.ts
│   └── package.json                        # scripts: dev, start, build, test, gen:api
├── e2e/                                    # Playwright integration tests (шаг 4)
│   ├── playwright.config.ts                # webServer: backend (:3000) + frontend preview (:4173)
│   ├── scenarios.md                        # описание сценариев
│   └── tests/booking.spec.ts               # главный happy-path
├── .github/workflows/e2e.yml               # CI для Playwright (НЕ путать с hexlet-check.yml)
├── Dockerfile                              # multi-stage: spec → frontend-build → backend-build → runtime (шаг 5)
├── .dockerignore
├── README.md
└── CLAUDE.md
```

`spec/main.tsp` — основной артефакт. Любые изменения поведения системы должны сначала отражаться там, потом — в реализации.

### Локальный запуск

```
cd spec && npm install && npm run compile && npm run mock    # Prism mock на :4010
cd frontend && npm install --legacy-peer-deps && npm run gen:api && npm run dev   # Vite на :5173
```

`.npmrc` в `frontend/` уже включает `legacy-peer-deps=true` (нужно из-за расхождения TS 6 в Vite 8 vs TS 5 в `openapi-typescript`).

## Технические договорённости

Эти решения зафиксированы; не предлагать обратное без явной просьбы пользователя.

1. **TypeSpec → OpenAPI → openapi-typescript.** Спецификация компилируется через эмиттер `@typespec/openapi3` (v0.65.x — старая ветка нужна, чтобы синтаксис `@service({...})` в `main.tsp` остался без изменений). Сгенерированный `openapi.yaml` скармливается `openapi-typescript` (на стороне фронта) и Prism (как mock).

2. **Не вводить выдуманных бизнес-правил.** Не добавлять рабочие часы, не ограничивать формат `EventType.id` через `@pattern`, не накладывать `@minLength`/`@maxLength` на поля. Если правила нет в задании Hexlet — его в контракте быть не должно. Фронт **не вычисляет** статусы слотов: берёт `slot.status` из API как есть.

3. **JSDoc-стиль документации в `.tsp` сохранять.** Не переписывать в `@doc(...)` декораторы.

4. **`outside_window` — это про 14-дневное окно, и только.** Не интерпретировать как «нерабочее время».

5. **Стек фронта зафиксирован (шаг 2):** Vite + React 19 + TypeScript + shadcn/ui (preset `radix-nova`) + React Router v6 + TanStack Query + react-hook-form + zod. Mock API — Prism. Стек бэка пока открыт.

6. **Часовой пояс.** Все даты в API — `utcDateTime`. Форматирование на фронте — через `Intl.DateTimeFormat` с явным `timeZone` (см. [frontend/src/lib/time.ts](frontend/src/lib/time.ts)). Никаких `new Date().toLocaleString()` без таймзоны.

7. **Интеграционные тесты (Playwright).** Живут в [e2e/tests/](e2e/) (`*.spec.ts`), конфиг — [e2e/playwright.config.ts](e2e/playwright.config.ts). Правила:
   - **Когда обязательно прогонять локально перед коммитом:** при правке `spec/main.tsp`, `backend/src/**` или `frontend/src/**` — запустить `npm test --prefix e2e` (бэк и фронт должны быть пересобраны: `npm run build` в backend/ и frontend/, а контракт — `npm run --prefix spec compile` + `gen:api`). Если тест падает — чинить корневую причину, а не коммитить «потом разберусь». CI всё равно перепроверит, но локальный прогон ловит проблему до push'а.
   - Селекторы только семантические: `getByRole`, `getByLabel`, `getByText`, `#id` для форм. Не цепляться к CSS-классам shadcn — они нестабильны и могут меняться при апдейтах темы.
   - Слоты выбираются по `aria-label` сетки в формате `«DD месяц HH:MM (status)»` (см. [frontend/src/components/SlotGrid.tsx](frontend/src/components/SlotGrid.tsx)).
   - Бэкенд в e2e ВСЕГДА стартует с `FIXED_CLOCK_ISO` (см. [backend/src/server.ts](backend/src/server.ts) и [backend/src/clock.ts](backend/src/clock.ts)) — иначе 14-дневное окно и расположение available-слотов плавают между прогонами.
   - CORS бэкенда пускает только `:5173` (Vite dev) и `:4173` (Vite preview, для e2e). Другие порты — не использовать ни во фронте, ни в Playwright config.
   - В `webServer` для backend всегда `reuseExistingServer: false` — он держит in-memory, иначе остатки прошлого прогона дают флапы. Frontend preview stateless — `reuseExistingServer: !process.env.CI` ОК.
   - CI: e2e живёт в отдельном workflow [.github/workflows/e2e.yml](.github/workflows/e2e.yml). `hexlet-check.yml` НЕ ТРОГАТЬ. Порядок шагов: `spec compile → backend/frontend gen:api → build → playwright install → playwright test`.
   - Описание покрытых сценариев — в [e2e/scenarios.md](e2e/scenarios.md); этот файл = «закреплённый» список сценариев по требованию шага 4.

8. **Прод-сборка — один Docker-образ (шаг 5).** [Dockerfile](Dockerfile) в корне — multi-stage (spec → frontend-build → backend-build → runtime на `node:22-alpine`). Fastify раздаёт собранный SPA через `@fastify/static` и обслуживает API под префиксом **`/api/*`**. Эти поведения **опциональны** и включаются через env: `API_PREFIX`, `STATIC_DIR`, `OPENAPI_SPEC_PATH`, `CORS_ORIGINS` (см. [backend/src/server.ts](backend/src/server.ts) и [backend/src/app.ts](backend/src/app.ts)). Без env бэк работает как в шаге 3 — роуты на корне, CORS на localhost-портах. **Это значит: локальный dev и e2e работать продолжают без изменений; правки в `frontend/.env` и `e2e/playwright.config.ts` не нужны.** Не переносить префикс `/api` в спецификацию контракта — это деплойная деталь, а не контракт. Фронт в Docker собирается с `VITE_API_URL=/api` (выставлено в Dockerfile); в `.dockerignore` исключён `**/.env*`, иначе локальный `frontend/.env` перетёр бы значение в образе. Деплой — Render Web Service из Dockerfile, health check `/api/owner`.

## Отладка и работа с ошибками

При возникновении ошибки не чинить симптом на поверхности. Сначала найти корневую причину, потом править её.

Алгоритм:
1. Прочитать ошибку и контекст целиком (стек, соседние логи, последние изменения).
2. Воспроизвести проблему — не догадываться по тексту ошибки.
3. Пройти по цепочке: данные → типы → конфиг → зависимости → API-контракт (`spec/main.tsp`). Симптом во фронте часто = неточность в контракте.
4. Чинить источник, а не падающую строку.
5. Проверить фикс: типы, билд, релевантные тесты, ручной прогон сценария.

Анти-паттерны (так делать **нельзя**, даже если "работает"):
- ослаблять типы (`any`, `as unknown as`, удаление `strict`-настроек);
- глушить исключения пустым `catch`, подавлять варнинги;
- удалять/скипать падающий тест вместо разбора, что он ловит;
- увеличивать таймауты, добавлять ретраи, хардкодить значения, чтобы обойти проблему;
- лепить локальный воркэраунд, если корневая причина лежит вне задачи — вместо этого явно сообщить пользователю и согласовать скоуп.

После нетривиального фикса — короткая (1–3 строки) сводка: в чём была корневая причина и что изменилось. Если фикс очевиден из диффа — сводка не нужна.

## Project skills

В [.claude/skills/](.claude/skills/) лежат project skills — короткие правила, которые агент должен
помнить при работе над соответствующими типами задач (Claude Code триггерит их по `description`):

- **contract-first-openapi** — `openapi.yaml`/`main.tsp` = source of truth; реализация от контракта; контракт не менять без согласования.
- **node-typescript-fastify** — конвенции бэкенда на Node+TS+Fastify.
- **fastify-openapi-validation** — runtime-валидация запросов/ответов из контракта (glue + Ajv) и контрактный error handling.
- **vitest-backend-testing** — тесты через `app.inject`, фиксированный clock, чистый store на каждый тест.
- **in-memory-domain-store** — in-memory без singleton, нормализация ключей, UTC-сетка слотов.
- **root-cause-debugging** — сначала корневая причина, потом фикс (полная политика — в разделе «Отладка» выше).

Когда применять: при реализации/правке бэкенда следовать первым пяти; **при любой ошибке — сначала
root-cause analysis (`root-cause-debugging`), а не правка первого симптома**.

## Рабочий процесс

- Каждый шаг задания приходит от пользователя отдельным сообщением (часто с PDF + текстом).
- Перед изменениями: убедиться, что задание понято; уточнить непонятное; согласовать план.
- Деливерабл шага коммитится в `main` и пушится → триггерит `hexlet-check`.
- Зелёный `hexlet-check` — индикатор сдачи, но не критерий: если CI падает по внешним причинам (например, временная проблема с инфраструктурой Hexlet/GitHub), сам артефакт в репо всё равно считается сданным.

## Прогресс

- **Шаг 1 — TypeSpec-спецификация:** ✅ сдан 2026-05-26. Контракт `spec/main.tsp` v1.2.0 (commit `f0989e3`). Покрывает все обязательные сценарии задания шага 1 (владелец + гость, 14-дневное окно, защита от двойного бронирования).
- **Шаг 2 — Фронтенд:** ✅ собран 2026-05-27. Vite-приложение в [frontend/](frontend/), 6 роутов (гость + админка), типы сгенерированы из `spec/main.tsp` через openapi-typescript, mock через Prism. Все 4 экрана драфта A (минималистичный SaaS) реализованы. `npm run build` зелёный.
- **Шаг 3 — Бэкенд:** ✅ собран 2026-05-29. Node.js + TypeScript + Fastify в [backend/](backend/). Все 7 операций контракта; роутинг и валидация запросов — через `fastify-openapi-glue` напрямую из `openapi.yaml`. Хранение in-memory (`createStore()` на каждый инстанс приложения). Бизнес-правила на бэке: 14-дневное окно, анти-двойное бронирование **по пересечению интервалов**, нормализация `startTime`. Ошибки — в контрактном формате `{code,message,field?}`. Тесты (vitest + `app.inject`, фиксированный clock) зелёные; контракт не менялся. Фронт по умолчанию ходит на :3000.
- **Шаг 4 — Интеграционные сценарии (Playwright):** ✅ собран 2026-05-30. Один happy-path тест в [e2e/tests/booking.spec.ts](e2e/tests/booking.spec.ts) (гость бронирует первый available-слот → экран успеха → слот в сетке стал booked). Реальный браузер против реального бэка + прод-сборки фронта; backend поднимается с `FIXED_CLOCK_ISO=2026-06-01T09:00:00Z` для детерминизма. CI — [.github/workflows/e2e.yml](.github/workflows/e2e.yml). Локально: `cd e2e && npm ci && npx playwright install chromium && npm test`. Контракт и `hexlet-check.yml` не менялись.
- **Шаг 5 — Docker + деплой на Render:** ✅ сдан 2026-05-30. Один [Dockerfile](Dockerfile) в корне (multi-stage, finalize: `node:22-alpine`). Прод-сборка — один контейнер: Fastify через `@fastify/static` раздаёт `frontend/dist`, API под префиксом `/api/*` (опционально через env — локальный dev/e2e не сломаны). `BuildOptions` в [backend/src/app.ts](backend/src/app.ts) расширены: `corsOrigins`, `apiPrefix`, `staticDir`, `openapiSpecPath`. SPA-fallback в `setNotFoundHandler` отдаёт `index.html` только для `GET`/`HEAD` вне `apiPrefix` с `Accept: text/html`; остальные 404 — в контрактном формате. Render Web Service из Dockerfile, free tier, health check `/api/owner`. Публичный URL — в [README.md](README.md). Контракт и `hexlet-check.yml` не менялись.
- Шаг 6 — ждёт старта.
