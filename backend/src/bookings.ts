import { randomUUID } from 'node:crypto'
import type { AdminBooking, Booking, BookingRequest, GuestBookingConfirmation } from './api/types.js'
import type { Clock } from './clock.js'
import { badRequest, conflict, notFound } from './errors.js'
import { bookingWindow, intervalsOverlap, startOfUtcDay } from './slots.js'
import type { Store } from './store.js'

const MINUTE = 60_000

// Прагматичная проверка email: контракт описывает поле как обычную строку,
// поэтому валидируем формат здесь и отдаём INVALID_GUEST_EMAIL.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Совпадает ли момент с сеткой слотов типа (шаг = длительность, якорь = полночь UTC текущего дня). */
function isOnGrid(startMs: number, stepMs: number, gridStartMs: number): boolean {
  const diff = startMs - gridStartMs
  return diff >= 0 && diff % stepMs === 0
}

export function createBooking(
  store: Store,
  clock: Clock,
  input: BookingRequest,
): GuestBookingConfirmation {
  const eventType = store.eventTypes.get(input.eventTypeId)
  if (!eventType) {
    throw notFound('EVENT_TYPE_NOT_FOUND', `Event type '${input.eventTypeId}' not found`)
  }

  if (!EMAIL_RE.test(input.guestEmail)) {
    throw badRequest('INVALID_GUEST_EMAIL', 'Guest email is not a valid email address', 'guestEmail')
  }

  // Нормализация момента: один и тот же инстант в разных offset/формате → один ключ.
  const startMs = new Date(input.startTime).getTime()
  if (Number.isNaN(startMs)) {
    throw badRequest('VALIDATION_ERROR', 'startTime is not a valid date-time', 'startTime')
  }

  const stepMs = eventType.durationInMinutes * MINUTE
  const endMs = startMs + stepMs

  const window = bookingWindow(clock)
  const nowMs = window.now.getTime()
  const windowEndMs = window.windowEnd.getTime()
  const gridStartMs = startOfUtcDay(window.now)

  if (!isOnGrid(startMs, stepMs, gridStartMs)) {
    throw badRequest('VALIDATION_ERROR', 'startTime does not match an available slot', 'startTime')
  }
  if (startMs <= nowMs) {
    throw badRequest('SLOT_IN_PAST', 'Slot is in the past', 'startTime')
  }
  if (startMs > windowEndMs) {
    throw badRequest(
      'SLOT_OUTSIDE_BOOKING_WINDOW',
      'Slot is outside the 14-day booking window',
      'startTime',
    )
  }

  // Анти-двойное бронирование: пересечение интервалов, независимо от eventTypeId.
  for (const existing of store.bookings.values()) {
    const existingStart = new Date(existing.startTime).getTime()
    const existingEnd = new Date(existing.endTime).getTime()
    if (intervalsOverlap(startMs, endMs, existingStart, existingEnd)) {
      throw conflict('SLOT_ALREADY_BOOKED', 'This time slot is already booked')
    }
  }

  const normalizedStart = new Date(startMs).toISOString()
  const booking: Booking = {
    id: randomUUID(),
    eventTypeId: eventType.id,
    startTime: normalizedStart,
    endTime: new Date(endMs).toISOString(),
    guestName: input.guestName,
    guestEmail: input.guestEmail,
    ...(input.notes !== undefined ? { notes: input.notes } : {}),
    createdAt: window.now.toISOString(),
  }
  store.bookings.set(normalizedStart, booking)

  return {
    ...booking,
    eventTypeTitle: eventType.title,
    durationInMinutes: eventType.durationInMinutes,
  }
}

export function listUpcomingBookings(store: Store, clock: Clock): AdminBooking[] {
  const nowMs = clock.now().getTime()
  return [...store.bookings.values()]
    .filter((booking) => new Date(booking.startTime).getTime() >= nowMs)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .map((booking) => {
      const eventType = store.eventTypes.get(booking.eventTypeId)
      const durationInMinutes = eventType
        ? eventType.durationInMinutes
        : Math.round((new Date(booking.endTime).getTime() - new Date(booking.startTime).getTime()) / MINUTE)
      return {
        ...booking,
        eventTypeTitle: eventType ? eventType.title : booking.eventTypeId,
        durationInMinutes,
      }
    })
}
