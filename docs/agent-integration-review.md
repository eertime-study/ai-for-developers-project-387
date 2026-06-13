# Финальная проверка интеграции агента в GitHub

Итог аудита агентного процесса (OpenCode в GitHub Actions): новых функций не добавляли —
проверяли устойчивость, безопасность и предсказуемость. Дата проверки: 2026-06-13.

## Workflow в репозитории

| Workflow | Триггеры | Назначение |
|---|---|---|
| [opencode.yml](../.github/workflows/opencode.yml) | `issue_comment`, `pull_request_review_comment` | Интерактивный агент по команде `/oc` (issue → PR → ревью → доработка) |
| [lighthouse.yml](../.github/workflows/lighthouse.yml) | `schedule` (cron), `workflow_dispatch` | Ночной аудит Lighthouse + утренний отчёт-issue от агента |
| [e2e.yml](../.github/workflows/e2e.yml) | `push`, `pull_request` | Playwright e2e (не агентный) |
| [hexlet-check.yml](../.github/workflows/hexlet-check.yml) | — | Проверка деливерабла курсом (не трогаем) |

## 1. Триггеры

- ✅ **Агент запускается только на целевые команды.** `opencode.yml` стартует лишь при
  `/oc`/`/opencode` в теле комментария (`startsWith`/`contains`).
- ✅ **Нет запусков на каждый комментарий.** Условие `if:` отсекает любые комментарии без команды;
  без `/oc` job не запускается.
- ✅ **Защита от самозапуска и ботов.** В `if:` добавлено `github.event.comment.user.type != 'Bot'`.
  Агент пишет как `opencode-agent[bot]` (`type=Bot`), поэтому его собственные комментарии и
  комментарии любых ботов больше не могут вызвать прогон → циклы исключены.
- ✅ **lighthouse.yml** не имеет comment-триггера (`schedule`+`workflow_dispatch`), поэтому ботами
  не дёргается. Issue `[lighthouse]` создаёт `app/github-actions` (GITHUB_TOKEN) — по правилам
  GitHub такие события не порождают новые прогоны.

## 2. Permissions (минимально необходимые)

- ✅ **opencode.yml**: `id-token: write` (auth), `contents: write` (push ветки PR),
  `pull-requests: write` (создание/обновление PR), `issues: read`. Write оправдан PR-сценарием.
- ✅ **lighthouse.yml**: `id-token: write`, `contents: write` (коммит базлайна),
  `issues: write` (отчёт-issue). `pull-requests` не выдан — правки фиксируются как issue.
- ✅ **e2e.yml**: сужен до `permissions: contents: read` (раньше наследовал дефолт репозитория).
- ✅ Лишних write-разрешений нет; каждый workflow получает ровно то, что использует.

## 3. Контроль расходов

- ✅ **Частота schedule разумная.** `lighthouse.yml` — раз в сутки (`cron: "17 3 * * *"`, не на
  начало часа). Ежечасных прогонов нет.
- ⚙️ **Модель под задачу.** Интерактивный `opencode.yml` — `opencode/claude-opus-4-8` (глубокая
  работа с кодом/PR, оправдано). `lighthouse.yml` — тоже Opus: оставлен осознанно ради надёжности
  многошагового gh/git-сценария. **Точка для удешевления:** ночную сводку можно перевести на более
  дешёвую модель (Sonnet/Haiku), если потребуется экономия.
- ✅ **Где смотреть run-ы.** Вкладка **Actions** → нужный workflow (`opencode` / `Lighthouse` /
  `e2e`). Отчёт Lighthouse: артефакт `lighthouse-report` (30 дней) + публичная ссылка в логах и в
  issue `[lighthouse]`. Базлайн трендов — [docs/performance-baseline.md](performance-baseline.md).

## 4. Подтверждение отработанных сценариев

- ✅ **Вызов агента в issue** — [#3](https://github.com/eertime-study/ai-for-developers-project-387/issues/3)
  (`/oc explain`, затем итеративная проработка плана фикса).
- ✅ **Агент создал PR и прошёл ревью** — [#4](https://github.com/eertime-study/ai-for-developers-project-387/pull/4):
  создан по `/oc`, получил общий и inline-комментарии, доработал обе правки в той же ветке, смержен.
- ✅ **Запуск scheduled workflow** — `lighthouse.yml` отработал через `workflow_dispatch` (агент
  создал отчёт-issue [#5](https://github.com/eertime-study/ai-for-developers-project-387/issues/5)
  и обновил базлайн); ночной cron заведётся по расписанию.

## 5. Самооценка эффективности

**С первого прохода:**
- Объяснение и план фикса в issue #3.
- Создание PR #4 по команде.
- Цикл «ревью → доработка»: агент учёл оба замечания за один проход.
- Фикс прав в `opencode.yml` (одна правка).
- Бонус: агент сам нашёл и починил баг в `scripts/lh-summary.mjs`.

**Потребовалось несколько итераций:**
- Scheduled Lighthouse: первый прогон завис (у scheduled-агента не было GitHub-токена в env →
  упёрся в интерактивное разрешение). Починили корнево — `GH_TOKEN` в env + компактная сводка.

**Вывод:** задач, решённых с первого раза, заметно больше, чем потребовавших итераций — хороший
признак зрелости процесса. Сценарии issue / PR / schedule работают стабильно, циклов и лишних
запусков нет.
