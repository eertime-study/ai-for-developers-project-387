import type { EventType, EventTypeCreateRequest } from './api/types.js'
import { badRequest, conflict, notFound } from './errors.js'
import type { Store } from './store.js'

export function listEventTypes(store: Store): EventType[] {
  return [...store.eventTypes.values()]
}

export function getEventType(store: Store, id: string): EventType {
  const eventType = store.eventTypes.get(id)
  if (!eventType) {
    throw notFound('EVENT_TYPE_NOT_FOUND', `Event type '${id}' not found`)
  }
  return eventType
}

export function createEventType(store: Store, input: EventTypeCreateRequest): EventType {
  // Длительность должна быть положительной — иначе сетка слотов невычислима.
  if (!Number.isInteger(input.durationInMinutes) || input.durationInMinutes <= 0) {
    throw badRequest(
      'VALIDATION_ERROR',
      'durationInMinutes must be a positive integer',
      'durationInMinutes',
    )
  }
  if (store.eventTypes.has(input.id)) {
    throw conflict('EVENT_TYPE_ALREADY_EXISTS', `Event type '${input.id}' already exists`)
  }

  const eventType: EventType = {
    id: input.id,
    title: input.title,
    description: input.description,
    durationInMinutes: input.durationInMinutes,
  }
  store.eventTypes.set(eventType.id, eventType)
  return eventType
}
