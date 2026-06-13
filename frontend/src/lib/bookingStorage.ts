import { z } from 'zod'
import type { components } from '@/api/schema'

type GuestBookingConfirmation = components['schemas']['GuestBookingConfirmation']

/**
 * Ключ в sessionStorage, под которым хранится последнее подтверждение брони.
 * Один ключ на всё приложение — новая бронь перезаписывает старую (cleanup вариант B).
 */
const STORAGE_KEY = 'lastBookingConfirmation'

/**
 * Минимальная валидация формы `GuestBookingConfirmation` для распарсенных данных.
 * Защищает экран успеха от битых / устаревших / чужих данных в storage.
 */
const confirmationSchema = z.object({
  id: z.string(),
  eventTypeId: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  guestName: z.string(),
  guestEmail: z.string(),
  notes: z.string().optional(),
  createdAt: z.string(),
  eventTypeTitle: z.string(),
  durationInMinutes: z.number(),
}) satisfies z.ZodType<GuestBookingConfirmation>

/**
 * Единственный writer: сохраняет подтверждение брони в sessionStorage.
 * Доступ к storage (а не только JSON.stringify) обёрнут в try/catch —
 * setItem может бросить в приватном режиме / при отключённом хранилище / при quota.
 * При ошибке тихо выходим: быстрый путь через location.state всё равно отработает.
 */
export function saveConfirmation(data: GuestBookingConfirmation): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // storage недоступен — деградируем без падения брони.
  }
}

/**
 * Читает подтверждение брони из sessionStorage.
 * Любая ошибка (недоступный storage, битый JSON, не прошедшая валидацию форма)
 * трактуется как «данных нет» → возвращаем null. Невалидные данные удаляем.
 */
export function readConfirmation(): GuestBookingConfirmation | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const parsed: unknown = JSON.parse(raw)
    const result = confirmationSchema.safeParse(parsed)
    if (result.success) {
      return result.data
    }

    // Битые / устаревшие данные иной формы — чистим, чтобы не висел мусор.
    sessionStorage.removeItem(STORAGE_KEY)
    return null
  } catch {
    return null
  }
}
