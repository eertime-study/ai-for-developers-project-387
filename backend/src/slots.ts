import type { Clock } from './clock.js'
import type { Booking, EventType, Slot, SlotListResponse, SlotStatus } from './api/types.js'
import type { Store } from './store.js'

const MINUTE = 60_000
const DAY = 24 * 60 * MINUTE

/** Окно записи — ровно 14 дней от текущего момента (контракт). */
export const BOOKING_WINDOW_DAYS = 14

/** Полночь UTC того же календарного дня, что и `date` (мс эпохи). */
export function startOfUtcDay(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}

export interface BookingWindow {
  now: Date
  windowStart: Date
  windowEnd: Date
}

export function bookingWindow(clock: Clock): BookingWindow {
  const now = clock.now()
  return {
    now,
    windowStart: now,
    windowEnd: new Date(now.getTime() + BOOKING_WINDOW_DAYS * DAY),
  }
}

/** Пересечение полуинтервалов [aStart, aEnd) и [bStart, bEnd). */
export function intervalsOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd
}

function bookingIntervals(bookings: Map<string, Booking>): Array<readonly [number, number]> {
  return [...bookings.values()].map(
    (b) => [new Date(b.startTime).getTime(), new Date(b.endTime).getTime()] as const,
  )
}

/**
 * Сетка слотов строится в UTC, шаг = `durationInMinutes`, выровнен от полуночи UTC
 * текущего дня. Генерируем слоты на полные сутки от начала текущего дня до конца дня,
 * содержащего `windowEnd`, — это даёт все 4 статуса. Рабочие часы НЕ применяются
 * (их нет в контракте); `owner.timeZone` на генерацию не влияет.
 *
 * Статус слота (согласован с правилами бронирования):
 * - `start <= now`        → past (слот уже начался/в прошлом — забронировать нельзя);
 * - `start > windowEnd`   → outside_window;
 * - пересекается с бронью → booked (по интервалам, независимо от eventTypeId);
 * - иначе                 → available.
 */
export function computeSlots(
  eventType: EventType,
  bookings: Map<string, Booking>,
  window: BookingWindow,
): Slot[] {
  const stepMs = eventType.durationInMinutes * MINUTE
  // Защита от некорректной длительности: без этого цикл генерации зациклится.
  if (stepMs <= 0) return []

  const nowMs = window.now.getTime()
  const windowEndMs = window.windowEnd.getTime()
  const gridStart = startOfUtcDay(window.now)
  const gridEndExclusive = startOfUtcDay(window.windowEnd) + DAY
  const intervals = bookingIntervals(bookings)

  const slots: Slot[] = []
  for (let start = gridStart; start < gridEndExclusive; start += stepMs) {
    const end = start + stepMs
    let status: SlotStatus
    if (start <= nowMs) {
      status = 'past'
    } else if (start > windowEndMs) {
      status = 'outside_window'
    } else if (intervals.some(([bs, be]) => intervalsOverlap(start, end, bs, be))) {
      status = 'booked'
    } else {
      status = 'available'
    }
    slots.push({
      startTime: new Date(start).toISOString(),
      endTime: new Date(end).toISOString(),
      status,
    })
  }
  return slots
}

export function buildSlotListResponse(
  eventType: EventType,
  store: Store,
  window: BookingWindow,
): SlotListResponse {
  return {
    eventTypeId: eventType.id,
    eventTypeTitle: eventType.title,
    durationInMinutes: eventType.durationInMinutes,
    timeZone: store.owner.timeZone,
    windowStart: window.windowStart.toISOString(),
    windowEnd: window.windowEnd.toISOString(),
    slots: computeSlots(eventType, store.bookings, window),
  }
}
