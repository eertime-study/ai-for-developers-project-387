### Hexlet tests and linter status:
[![Actions Status](https://github.com/eertime-study/ai-for-developers-project-387/actions/workflows/hexlet-check.yml/badge.svg)](https://github.com/eertime-study/ai-for-developers-project-387/actions)

## Календарь звонков

Учебный Design First проект: фиксируем API-контракт в TypeSpec, затем независимо реализуем фронтенд и бэкенд по нему.

### Развёрнутая версия

Приложение задеплоено на Render одним Docker-образом, фронт и бэк под одним доменом:

| Что | URL |
|-----|-----|
| Главная (гость) | https://ai-for-developers-project-386-isaw.onrender.com/ |
| Админка владельца | https://ai-for-developers-project-386-isaw.onrender.com/admin/bookings |
| Health check API | https://ai-for-developers-project-386-isaw.onrender.com/api/owner |

Авторизации нет: владелец один, заранее задан в контракте, роль определяется путём в URL. Ссылки из гостевой части на админку нет намеренно — публичный URL не должен раскрывать административный экран.

> Render free tier «засыпает» при простое — первый запрос после паузы может занять ~30 секунд, пока контейнер просыпается. Это нормально.

### Спецификация

API-контракт описан в [spec/main.tsp](spec/main.tsp) на [TypeSpec](https://typespec.io/). Он покрывает публичные сценарии гостя (просмотр типов событий, выбор слота в 14-дневном окне, бронирование) и административные сценарии владельца календаря (создание типов событий, просмотр предстоящих встреч).

### Фронтенд

UI лежит в [frontend/](frontend/). Стек:

- **Vite + React 19 + TypeScript** — сборка и dev-сервер
- **shadcn/ui** (preset radix-nova, на Radix + Tailwind) — UI-компоненты
- **React Router v6** — маршрутизация
- **TanStack Query** — запросы, кэш, инвалидация
- **react-hook-form + zod** — формы и валидация
- **openapi-typescript** — генерация типов из контракта
- **[Prism](https://stoplight.io/open-source/prism)** — mock-сервер по `openapi.yaml`

Типы API генерируются из `spec/main.tsp` → `openapi.yaml` → `frontend/src/api/schema.ts`, поэтому фронт всегда соответствует контракту. Технические договорённости — в [CLAUDE.md](CLAUDE.md).

Структура `frontend/src/`:

```
src/
├── api/
│   ├── schema.ts      # автоген типов из openapi.yaml (не править руками)
│   ├── client.ts      # типизированный openapi-fetch + класс ошибки ApiFailure
│   └── queries.ts     # хуки TanStack Query на все операции контракта
├── lib/
│   ├── time.ts        # форматирование дат через Intl.DateTimeFormat(timeZone)
│   └── utils.ts       # cn() от shadcn
├── components/
│   ├── ui/            # примитивы shadcn (button, card, input, table, alert, …)
│   ├── AppShell.tsx   # общий layout: шапка + футер с часовым поясом
│   ├── OwnerHeader.tsx, EventTypeCard.tsx
│   ├── SlotGrid.tsx, SlotLegend.tsx          # 14-дневная сетка слотов
│   └── BookingsTable.tsx, EventTypeCreateForm.tsx  # админка
├── routes/
│   ├── EventTypesListPage.tsx   # /                         (гость: список типов)
│   ├── SlotPickerPage.tsx       # /event-types/:id          (сетка слотов)
│   ├── BookingFormPage.tsx      # /event-types/:id/book     (форма бронирования)
│   ├── BookingSuccessPage.tsx   # /bookings/success         (экран успеха)
│   ├── AdminPage.tsx            # /admin/bookings           (таблица + создание типа)
│   └── NotFoundPage.tsx         # *                         (404)
├── main.tsx           # bootstrap: QueryClientProvider + RouterProvider
└── App.tsx            # layout-обёртка
```

### Бэкенд

Серверная часть в [backend/](backend/) реализует API строго по контракту (`openapi.yaml`),
хранение — in-memory (сброс при рестарте). Стек: **Node.js + TypeScript + Fastify**; роутинг и
валидация запросов — через `fastify-openapi-glue` напрямую из контракта. Бизнес-правила
бронирования (14-дневное окно, анти-двойное бронирование по пересечению интервалов) — на бэкенде.
Подробности, эндпоинты и оговорки — в [backend/README.md](backend/README.md).

### Локальный запуск

Фронт по умолчанию (`frontend/.env`) ходит на реальный бэкенд (`http://localhost:3000`).
Шаги — собрать контракт, поднять бэкенд, поднять фронт:

```sh
# 1. собрать контракт (нужен и фронту, и бэку)
cd spec && npm install && npm run compile

# 2. бэкенд на :3000
cd backend && npm install && npm run gen:api && npm run dev

# 3. фронт на :5173
cd frontend && npm install --legacy-peer-deps && npm run gen:api && npm run dev
```

Откройте `http://localhost:5173/`. Если страница не грузится — почти всегда не запущен один из процессов.

> Вместо бэкенда можно поднять Prism-мок (`cd spec && npm run mock`, :4010) и указать
> `VITE_API_URL=http://localhost:4010` в `frontend/.env` — это контрактный мок со случайными данными.

### Роли и навигация

Авторизации нет (по контракту владелец один и заранее задан). Роли разведены по URL:

| Роль | URL | Что доступно |
|------|-----|--------------|
| **Гость** | `http://localhost:5173/` | Список типов встреч → выбор слота → бронирование → экран успеха |
| **Владелец** | `http://localhost:5173/admin/bookings` | Таблица предстоящих встреч + форма создания типа встречи |

Переключение — смена адреса в браузере. Ссылки из гостевой части в админку нет намеренно: публичный URL не должен раскрывать административный экран.

> На проде те же пути от корня домена — см. [Развёрнутая версия](#развёрнутая-версия).

### Что проверить в UI

При запущенных бэкенде (:3000) и Vite (:5173):

1. **Бронирование (happy path):** `/` → выбрать тип → кликнуть зелёный (`available`) слот → заполнить имя/email → «Забронировать» → попасть на экран успеха.
2. **Слот уже занят (409):** при повторном бронировании занятого слота — красный баннер «Этот слот уже заняли» со ссылкой на возврат к сетке.
3. **Невалидный email:** ввести строку без `@` → submit блокируется с подсказкой под полем.
4. **Создание типа встречи:** на `/admin/bookings` заполнить форму справа → «Создать тип встречи» → зелёный alert, форма очищается, новый тип появляется в списке гостя.

> С реальным бэкендом данные осмысленные и хранятся в памяти до рестарта. Если вместо него
> поднять Prism-мок, он отдаёт **случайные** данные (lorem ipsum, абсурдные даты) — это нормально
> для контрактного мока.

### E2E (Playwright)

Интеграционные тесты в [e2e/](e2e/) гоняют **реальный** Chromium против **реального** бэкенда (Fastify, in-memory) и **реального** прод-сборки фронтенда (`vite preview`). Сценарий описан в [e2e/scenarios.md](e2e/scenarios.md); главный — гость бронирует первый available-слот и убеждается, что слот стал `booked` в сетке.

Бэкенд в e2e стартует с фиксированным clock через env (`FIXED_CLOCK_ISO=2026-06-01T09:00:00Z`) — без этого 14-дневная сетка слотов и набор статусов меняются между прогонами.

Полная последовательность от чистого клона (`npm ci` — ближе к CI и опирается на закоммиченные `package-lock.json`):

```sh
cd spec     && npm ci && npm run compile
cd ../backend  && npm ci && npm run gen:api && npm run build
cd ../frontend && npm ci --legacy-peer-deps && npm run gen:api && npm run build
cd ../e2e      && npm ci && npx playwright install chromium
cd ../e2e      && npm test
```

`webServer` в [e2e/playwright.config.ts](e2e/playwright.config.ts) сам поднимает backend (`:3000`) и frontend preview (`:4173`) — отдельных терминалов не нужно. Для интерактивной отладки — `npm run test:ui`. CI-воркфлоу: [.github/workflows/e2e.yml](.github/workflows/e2e.yml); при падении на ветке артефакты `playwright-report` и `test-results` (traces, screenshots) доступны 7 дней.

### Docker и деплой

Прод-сборка упакована в один Docker-образ: Fastify раздаёт собранный SPA из [frontend/dist](frontend/) и обслуживает API под префиксом `/api/*` — это даёт одну точку входа на Render, без CORS и без второго сервиса.

Сборка и локальный прогон:

```sh
docker build -t call-calendar .
docker run --rm -p 8080:8080 -e PORT=8080 call-calendar
# открыть http://localhost:8080/
```

Образ слушает `process.env.PORT` (по умолчанию 3000 без env, Render выставляет своё значение автоматически). Внутри образа уже выставлены `API_PREFIX=/api`, `STATIC_DIR=/app/frontend-dist`, `OPENAPI_SPEC_PATH=/app/openapi.yaml` — никаких дополнительных env-переменных для запуска не требуется.

Публичный URL и список прод-адресов — в секции [Развёрнутая версия](#развёрнутая-версия).

Render-конфигурация: Web Service из Dockerfile (Dockerfile path `./Dockerfile`, root directory пуст), health check path `/api/owner`, free tier. На локальный dev/E2E деплойная упаковка не влияет — backend сохраняет старое поведение (роуты на корне, CORS на localhost-портах), когда `API_PREFIX`/`STATIC_DIR` не заданы.

### Полезные скрипты

| Команда | Где | Назначение |
|---------|-----|------------|
| `npm run compile` | `spec/` | TypeSpec → `openapi.yaml` |
| `npm run mock` | `spec/` | Prism mock на :4010 (альтернатива бэкенду) |
| `npm run gen:api` | `frontend/` | Регенерация типов из контракта (`schema.ts`) |
| `npm run dev` | `frontend/` | Dev-сервер Vite на :5173 |
| `npm run build` | `frontend/` | Прод-сборка (`tsc -b && vite build`) |
| `npm run preview` | `frontend/` | Прод-сборка на :4173 (используется e2e) |
| `npm run dev` | `backend/` | Бэкенд (Fastify) на :3000 |
| `npm start` | `backend/` | Бэкенд из `dist/` (используется e2e) |
| `npm test` | `backend/` | Тесты бэкенда (vitest) |
| `npm run gen:api` | `backend/` | Регенерация типов бэкенда из контракта |
| `npm test` | `e2e/` | Playwright e2e тесты (поднимает backend+frontend сам) |
| `npm run test:ui` | `e2e/` | Playwright UI для отладки тестов |
| `docker build -t call-calendar .` | корень | Прод-образ (один контейнер: API под `/api/*` + SPA) |
| `docker run --rm -p 8080:8080 -e PORT=8080 call-calendar` | корень | Локальный прогон образа на :8080 |