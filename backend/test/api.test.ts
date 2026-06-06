import type { FastifyInstance } from 'fastify'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { buildApp } from '../src/app.js'
import { fixedClock } from '../src/clock.js'

// Фиксированное «сейчас» — окно записи: 2026-06-01T12:00Z … 2026-06-15T12:00Z (UTC).
const NOW = '2026-06-01T12:00:00.000Z'

let app: FastifyInstance

beforeEach(async () => {
  // Свежее приложение = свежий in-memory store на каждый тест.
  app = await buildApp({ clock: fixedClock(NOW) })
  await app.ready()
})

afterEach(async () => {
  await app.close()
})

interface BookingOverrides {
  eventTypeId?: string
  startTime?: string
  guestName?: string
  guestEmail?: string
  notes?: string
}

function book(overrides: BookingOverrides = {}) {
  return app.inject({
    method: 'POST',
    url: '/bookings',
    payload: {
      eventTypeId: 'intro-call',
      startTime: '2026-06-02T10:00:00.000Z',
      guestName: 'Гость',
      guestEmail: 'guest@example.com',
      ...overrides,
    },
  })
}

describe('owner & event types', () => {
  it('GET /owner returns predefined owner with 200', async () => {
    const res = await app.inject({ method: 'GET', url: '/owner' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({
      id: 'owner-anna',
      name: 'Анна Петрова',
      timeZone: 'Europe/Moscow',
    })
  })

  it('GET /event-types lists seeded types', async () => {
    const res = await app.inject({ method: 'GET', url: '/event-types' })
    expect(res.statusCode).toBe(200)
    const ids = (res.json() as Array<{ id: string }>).map((t) => t.id)
    expect(ids).toContain('intro-call')
    expect(ids).toContain('consultation-60')
  })

  it('GET /event-types/{id} returns 404 for unknown id', async () => {
    const res = await app.inject({ method: 'GET', url: '/event-types/nope' })
    expect(res.statusCode).toBe(404)
    expect(res.json().code).toBe('EVENT_TYPE_NOT_FOUND')
  })
})

describe('slots', () => {
  it('returns a 14-day grid with past, available and outside_window statuses', async () => {
    const res = await app.inject({ method: 'GET', url: '/event-types/intro-call/slots' })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.eventTypeId).toBe('intro-call')
    expect(body.windowStart).toBe(NOW)
    expect(body.windowEnd).toBe('2026-06-15T12:00:00.000Z')
    const statuses = new Set((body.slots as Array<{ status: string }>).map((s) => s.status))
    expect(statuses.has('past')).toBe(true)
    expect(statuses.has('available')).toBe(true)
    expect(statuses.has('outside_window')).toBe(true)
  })

  it('marks a slot booked after a booking', async () => {
    await book({ startTime: '2026-06-02T10:00:00.000Z' })
    const res = await app.inject({ method: 'GET', url: '/event-types/intro-call/slots' })
    const slot = (res.json().slots as Array<{ startTime: string; status: string }>).find(
      (s) => s.startTime === '2026-06-02T10:00:00.000Z',
    )
    expect(slot?.status).toBe('booked')
  })
})

describe('createBooking — happy path', () => {
  it('returns 200 with a guest confirmation (not 201)', async () => {
    const res = await book()
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.id).toBeTruthy()
    expect(body.eventTypeId).toBe('intro-call')
    expect(body.startTime).toBe('2026-06-02T10:00:00.000Z')
    expect(body.endTime).toBe('2026-06-02T10:30:00.000Z')
    expect(body.eventTypeTitle).toBe('Вводный звонок')
    expect(body.durationInMinutes).toBe(30)
  })
})

describe('createBooking — anti double-booking', () => {
  it('rejects booking the same moment twice with 409', async () => {
    expect((await book()).statusCode).toBe(200)
    const res = await book()
    expect(res.statusCode).toBe(409)
    expect(res.json().code).toBe('SLOT_ALREADY_BOOKED')
  })

  it('rejects the same moment under a different event type with 409', async () => {
    expect((await book({ eventTypeId: 'intro-call', startTime: '2026-06-02T10:00:00.000Z' })).statusCode).toBe(200)
    const res = await book({ eventTypeId: 'consultation-60', startTime: '2026-06-02T10:00:00.000Z' })
    expect(res.statusCode).toBe(409)
    expect(res.json().code).toBe('SLOT_ALREADY_BOOKED')
  })

  it('rejects overlapping intervals of different durations with 409', async () => {
    // consultation-60: 10:00–11:00
    expect((await book({ eventTypeId: 'consultation-60', startTime: '2026-06-03T10:00:00.000Z' })).statusCode).toBe(200)
    // intro-call 30 мин на 10:30–11:00 пересекается → конфликт
    const res = await book({ eventTypeId: 'intro-call', startTime: '2026-06-03T10:30:00.000Z' })
    expect(res.statusCode).toBe(409)
    expect(res.json().code).toBe('SLOT_ALREADY_BOOKED')
  })

  it('normalizes startTime offset so the same instant cannot be double-booked', async () => {
    expect((await book({ startTime: '2026-06-04T10:00:00.000Z' })).statusCode).toBe(200)
    // 13:00+03:00 — это тот же момент, что 10:00Z
    const res = await book({ startTime: '2026-06-04T13:00:00+03:00' })
    expect(res.statusCode).toBe(409)
    expect(res.json().code).toBe('SLOT_ALREADY_BOOKED')

    // в хранилище — ровно одна бронь (нормализованный ключ)
    const admin = await app.inject({ method: 'GET', url: '/admin/bookings' })
    expect((admin.json() as unknown[]).length).toBe(1)
  })
})

describe('createBooking — validation & business errors', () => {
  it('rejects an invalid email with 400 INVALID_GUEST_EMAIL', async () => {
    const res = await book({ guestEmail: 'not-an-email' })
    expect(res.statusCode).toBe(400)
    const body = res.json()
    expect(body.code).toBe('INVALID_GUEST_EMAIL')
    expect(body.field).toBe('guestEmail')
  })

  it('rejects an unknown event type with 404', async () => {
    const res = await book({ eventTypeId: 'ghost' })
    expect(res.statusCode).toBe(404)
    expect(res.json().code).toBe('EVENT_TYPE_NOT_FOUND')
  })

  it('rejects a past slot with 400 SLOT_IN_PAST', async () => {
    const res = await book({ startTime: '2026-06-01T09:00:00.000Z' })
    expect(res.statusCode).toBe(400)
    expect(res.json().code).toBe('SLOT_IN_PAST')
  })

  it('rejects a slot outside the 14-day window with 400 SLOT_OUTSIDE_BOOKING_WINDOW', async () => {
    const res = await book({ startTime: '2026-06-15T13:00:00.000Z' })
    expect(res.statusCode).toBe(400)
    expect(res.json().code).toBe('SLOT_OUTSIDE_BOOKING_WINDOW')
  })

  it('rejects a startTime off the slot grid with 400 VALIDATION_ERROR', async () => {
    const res = await book({ startTime: '2026-06-02T10:05:00.000Z' })
    expect(res.statusCode).toBe(400)
    expect(res.json().code).toBe('VALIDATION_ERROR')
  })
})

describe('createEventType', () => {
  it('creates a new event type with 200 and exposes it to guests', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/admin/event-types',
      payload: { id: 'deep-dive', title: 'Глубокое погружение', description: 'Час обсуждения', durationInMinutes: 60 },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().id).toBe('deep-dive')

    const list = await app.inject({ method: 'GET', url: '/event-types' })
    expect((list.json() as Array<{ id: string }>).map((t) => t.id)).toContain('deep-dive')
  })

  it('rejects a duplicate id with 409 EVENT_TYPE_ALREADY_EXISTS', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/admin/event-types',
      payload: { id: 'intro-call', title: 'Дубль', description: 'x', durationInMinutes: 30 },
    })
    expect(res.statusCode).toBe(409)
    expect(res.json().code).toBe('EVENT_TYPE_ALREADY_EXISTS')
  })
})

describe('error format & admin listing', () => {
  it('returns contract error body {code, message}, not the default Fastify shape', async () => {
    const res = await app.inject({ method: 'POST', url: '/bookings', payload: { eventTypeId: 'intro-call' } })
    expect(res.statusCode).toBe(400)
    const body = res.json()
    expect(body.code).toBe('VALIDATION_ERROR')
    expect(typeof body.message).toBe('string')
    // дефолтный формат Fastify не должен протекать
    expect(body.statusCode).toBeUndefined()
    expect(body.error).toBeUndefined()
  })

  it('lists only upcoming bookings, enriched and sorted by startTime', async () => {
    await book({ startTime: '2026-06-05T10:00:00.000Z' })
    await book({ startTime: '2026-06-03T09:00:00.000Z' })

    const res = await app.inject({ method: 'GET', url: '/admin/bookings' })
    expect(res.statusCode).toBe(200)
    const rows = res.json() as Array<{ startTime: string; eventTypeTitle: string; durationInMinutes: number }>
    expect(rows.map((r) => r.startTime)).toEqual([
      '2026-06-03T09:00:00.000Z',
      '2026-06-05T10:00:00.000Z',
    ])
    expect(rows[0]?.eventTypeTitle).toBe('Вводный звонок')
    expect(rows[0]?.durationInMinutes).toBe(30)
  })
})
