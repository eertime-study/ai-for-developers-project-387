#!/usr/bin/env node
// Собирает компактную сводку из результатов Lighthouse CI (.lighthouseci/) в lighthouse-summary.md.
// Цель — отдать OpenCode-агенту маленький читаемый файл вместо тяжёлых lhr-*.json,
// чтобы шаг отчёта отрабатывал быстро и дёшево.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'

const LHCI_DIR = '.lighthouseci'
const OUT = 'lighthouse-summary.md'

const read = (p) => JSON.parse(readFileSync(p, 'utf8'))

// LHCI с target=temporary-public-storage пишет lhr-*.json + links.json, но manifest.json
// появляется не всегда. Поэтому: если манифеста нет — реконструируем его из lhr-*.json,
// выбирая медианный по performance прогон как представительный (как делает сам LHCI).
const lhrUrl = (lhr) => lhr.finalUrl || lhr.finalDisplayedUrl || lhr.requestedUrl

const buildManifestFromLhr = () => {
  const files = readdirSync(LHCI_DIR).filter((f) => f.startsWith('lhr-') && f.endsWith('.json'))
  if (files.length === 0) return null
  const byUrl = new Map()
  for (const f of files) {
    const jsonPath = `${LHCI_DIR}/${f}`
    const lhr = read(jsonPath)
    const url = lhrUrl(lhr)
    const c = lhr.categories ?? {}
    const entry = {
      url,
      jsonPath,
      summary: {
        performance: c.performance?.score,
        accessibility: c.accessibility?.score,
        'best-practices': c['best-practices']?.score,
        seo: c.seo?.score,
        pwa: c.pwa?.score,
      },
    }
    if (!byUrl.has(url)) byUrl.set(url, [])
    byUrl.get(url).push(entry)
  }
  const manifest = []
  for (const runs of byUrl.values()) {
    runs.sort((a, b) => (a.summary.performance ?? 0) - (b.summary.performance ?? 0))
    const median = runs[Math.floor((runs.length - 1) / 2)]
    for (const run of runs) manifest.push({ ...run, isRepresentativeRun: run === median })
  }
  return manifest
}

let manifest
try {
  manifest = read(`${LHCI_DIR}/manifest.json`)
} catch {
  manifest = buildManifestFromLhr()
}

if (!manifest || manifest.length === 0) {
  console.error('Не удалось собрать сводку: нет ни manifest.json, ни lhr-*.json в .lighthouseci/')
  writeFileSync(OUT, '# Lighthouse summary\n\nРезультаты прогона отсутствуют (нет данных в .lighthouseci/).\n')
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
