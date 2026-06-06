import type { FastifyRequest } from 'fastify'
import type { BookingRequest, EventTypeCreateRequest } from './api/types.js'
import { createBooking, listUpcomingBookings } from './bookings.js'
import type { Clock } from './clock.js'
import { createEventType, getEventType, listEventTypes } from './eventTypes.js'
import { bookingWindow, buildSlotListResponse } from './slots.js'
import type { Store } from './store.js'

/**
 * Сервис-хэндлеры; ключи совпадают с `operationId` из openapi.yaml (с префиксом
 * интерфейса) — fastify-openapi-glue резолвит роуты по этим именам и сам валидирует
 * запросы по контракту. Успешные ответы идут со статусом 200 (как в контракте).
 *
 * Касты `request.params`/`request.body` — инфраструктурные: glue не типизирует
 * хэндлеры, а сами данные уже провалидированы AJV против контракта.
 */
export function createService(store: Store, clock: Clock) {
  return {
    GuestOperations_getOwner: async () => store.owner,

    GuestOperations_listEventTypes: async () => listEventTypes(store),

    GuestOperations_getEventType: async (request: FastifyRequest) => {
      const { id } = request.params as { id: string }
      return getEventType(store, id)
    },

    GuestOperations_listSlots: async (request: FastifyRequest) => {
      const { id } = request.params as { id: string }
      const eventType = getEventType(store, id)
      return buildSlotListResponse(eventType, store, bookingWindow(clock))
    },

    GuestOperations_createBooking: async (request: FastifyRequest) => {
      return createBooking(store, clock, request.body as BookingRequest)
    },

    AdminOperations_createEventType: async (request: FastifyRequest) => {
      return createEventType(store, request.body as EventTypeCreateRequest)
    },

    AdminOperations_listUpcomingBookings: async () => listUpcomingBookings(store, clock),
  }
}
