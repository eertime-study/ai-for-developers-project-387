/**
 * Источник текущего времени. Доменная логика берёт `now` только отсюда,
 * чтобы тесты могли подменить время фиксированным значением и не флапать.
 */
export interface Clock {
  now(): Date
}

export const systemClock: Clock = {
  now: () => new Date(),
}

/** Фиксированный clock для тестов. */
export function fixedClock(iso: string): Clock {
  const at = new Date(iso)
  return { now: () => new Date(at) }
}
