const dateCache = new Map<string, Intl.DateTimeFormat>()
const timeCache = new Map<string, Intl.DateTimeFormat>()
const dateTimeCache = new Map<string, Intl.DateTimeFormat>()
const weekdayCache = new Map<string, Intl.DateTimeFormat>()

const locale = 'ru-RU'

function safeFmt(timeZone: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  try {
    return new Intl.DateTimeFormat(locale, { ...options, timeZone })
  } catch {
    return new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' })
  }
}

function getFmt(
  cache: Map<string, Intl.DateTimeFormat>,
  timeZone: string,
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  let f = cache.get(timeZone)
  if (!f) {
    f = safeFmt(timeZone, options)
    cache.set(timeZone, f)
  }
  return f
}

export function formatTime(iso: string, timeZone: string): string {
  const fmt = getFmt(timeCache, timeZone, { hour: '2-digit', minute: '2-digit', hour12: false })
  return fmt.format(new Date(iso))
}

export function formatDate(iso: string, timeZone: string): string {
  const fmt = getFmt(dateCache, timeZone, { day: 'numeric', month: 'long', year: 'numeric' })
  return fmt.format(new Date(iso))
}

export function formatDateTime(iso: string, timeZone: string): string {
  const fmt = getFmt(dateTimeCache, timeZone, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  return fmt.format(new Date(iso))
}

export function formatWeekday(iso: string, timeZone: string): string {
  const fmt = getFmt(weekdayCache, timeZone, { weekday: 'short' })
  return fmt.format(new Date(iso))
}

export function formatDayMonth(iso: string, timeZone: string): string {
  const fmt = safeFmt(timeZone, { day: 'numeric', month: 'short' })
  return fmt.format(new Date(iso))
}

export function formatRange(startIso: string, endIso: string, timeZone: string): string {
  return `${formatTime(startIso, timeZone)} — ${formatTime(endIso, timeZone)}`
}

export function dayKey(iso: string, timeZone: string): string {
  let fmt: Intl.DateTimeFormat
  try {
    fmt = new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone,
    })
  } catch {
    fmt = new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'UTC',
    })
  }
  return fmt.format(new Date(iso))
}

export function timeKey(iso: string, timeZone: string): string {
  return formatTime(iso, timeZone)
}
