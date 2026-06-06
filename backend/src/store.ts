import type { Booking, EventType, Owner } from './api/types.js'
import { seedEventTypes, seedOwner } from './seed.js'

/**
 * In-memory хранилище одного инстанса приложения.
 * Ключ `bookings` — нормализованный `startTime` (UTC ISO): один момент = одна бронь.
 * Пересечения интервалов проверяются отдельно в доменной логике бронирования.
 */
export interface Store {
  owner: Owner
  eventTypes: Map<string, EventType>
  bookings: Map<string, Booking>
}

/**
 * Создаёт НОВОЕ чистое хранилище. Вызывается из `buildApp()`, поэтому каждый
 * инстанс приложения (в т.ч. в каждом тесте) изолирован — глобального singleton нет.
 */
export function createStore(): Store {
  const eventTypes = new Map<string, EventType>()
  for (const eventType of seedEventTypes) {
    eventTypes.set(eventType.id, { ...eventType })
  }

  return {
    owner: { ...seedOwner },
    eventTypes,
    bookings: new Map(),
  }
}
