#!/usr/bin/env node
// Собирает компактную сводку из результатов Lighthouse CI (.lighthouseci/) в lighthouse-summary.md.
// Цель — отдать OpenCode-агенту маленький читаемый файл вместо тяжёлых lhr-*.json,
// чтобы шаг отчёта отрабатывал быстро и дёшево.
import { readFileSync, writeFileSync } from 'node:fs'

const LHCI_DIR = '.lighthouseci'
const OUT = 'lighthouse-summary.md'

const read = (p) => JSON.parse(readFileSync(p, 'utf8'))

let manifest
try {
  manifest = read(`${LHCI_DIR}/manifest.json`)
} catch (e) {
  console.error(`Не удалось прочитать ${LHCI_DIR}/manifest.json:`, e.message)
  writeFileSync(OUT, '# Lighthouse summary\n\nРезультаты прогона отсутствуют (manifest.json не найден).\n')
  process.exit(0)
}

let links = {}
try {
  links = read(`${LHCI_DIR}/links.json`)
} catch {
  // публичных ссылок может не быть — не критично
}

const pct = (v) => (v == null ? '—' : Math.round(v * 100))
const ms = (v) => (v == null ? '—' : `${Math.round(v)} ms`)
const num = (v) => (v == null ? '—' : v.toFixed(3))
const date = new Date().toISOString().slice(0, 10)

// По каждому URL берём представительный прогон (медиана), иначе первый попавшийся.
const byUrl = new Map()
for (const run of manifest) {
  if (!byUrl.has(run.url) || run.isRepresentativeRun) byUrl.set(run.url, run)
}

const lines = [`# Lighthouse summary — ${date} (UTC)`, '']

for (const [url, run] of byUrl) {
  const s = run.summary ?? {}
  let metrics = {}
  try {
    const lhr = read(run.jsonPath)
    const a = lhr.audits ?? {}
    metrics = {
      lcp: a['largest-contentful-paint']?.numericValue,
      tbt: a['total-blocking-time']?.numericValue,
      cls: a['cumulative-layout-shift']?.numericValue,
      fcp: a['first-contentful-paint']?.numericValue,
      si: a['speed-index']?.numericValue,
    }
  } catch (e) {
    console.error(`Нет lhr для ${url}: ${e.message}`)
  }

  lines.push(`## ${url}`, '')
  const link = links[url]
  if (link) lines.push(`HTML-отчёт: ${link}`, '')
  lines.push(
    '| Performance | Accessibility | Best Practices | SEO | LCP | TBT | CLS | FCP | Speed Index |',
    '|---|---|---|---|---|---|---|---|---|',
    `| ${pct(s.performance)} | ${pct(s.accessibility)} | ${pct(s['best-practices'])} | ${pct(s.seo)} | ${ms(metrics.lcp)} | ${ms(metrics.tbt)} | ${num(metrics.cls)} | ${ms(metrics.fcp)} | ${ms(metrics.si)} |`,
    '',
  )
}

const md = lines.join('\n')
writeFileSync(OUT, md)
console.log(md)
