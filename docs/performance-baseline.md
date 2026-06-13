# Performance baseline (Lighthouse)

Базлайн производительности для регулярного аудита из
[.github/workflows/lighthouse.yml](../.github/workflows/lighthouse.yml).

Файл ведёт **OpenCode-агент**: на каждом ночном (или ручном) прогоне он сравнивает свежие
показатели Lighthouse с таблицами ниже, помечает регрессии >10% в issue `[lighthouse]`, а затем
перезаписывает таблицы новыми значениями. Так фиксируется тренд между прогонами.

- Категории — оценка Lighthouse 0–100 (выше лучше).
- Lab-метрики — из лабораторного прогона Lighthouse (не field): **LCP**, **TBT**, **CLS**, **FCP**,
  **Speed Index**. FID/INP здесь не приводятся — это field-метрики, в lab Lighthouse их нет; за
  интерактивность в lab отвечает TBT.
- Источник чисел — медиана из `numberOfRuns` представительного прогона (`isRepresentativeRun`).

> Стартовый базлайн зафиксирован прогоном **2026-06-13 (UTC)** — это первый замер, сравнивать
> было не с чем. Следующий прогон сравнивается с таблицами ниже.

## Главная (гость) — `/`

| Дата (UTC) | Performance | Accessibility | Best Practices | SEO | LCP | TBT | CLS | FCP | Speed Index |
|---|---|---|---|---|---|---|---|---|---|
| 2026-06-13 | 100 | 100 | 96 | 90 | 581 ms | 0 ms | 0.001 | 541 ms | 1019 ms |

## Админка владельца — `/admin/bookings`

| Дата (UTC) | Performance | Accessibility | Best Practices | SEO | LCP | TBT | CLS | FCP | Speed Index |
|---|---|---|---|---|---|---|---|---|---|
| 2026-06-13 | 100 | 100 | 96 | 90 | 537 ms | 0 ms | 0.000 | 537 ms | 596 ms |
