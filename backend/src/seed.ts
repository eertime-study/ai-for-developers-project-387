import type { EventType, Owner } from './api/types.js'

/**
 * Владелец календаря предзадан (контракт: владелец один, авторизации нет).
 * `timeZone` — валидная IANA-зона; используется фронтом для человеческого
 * представления времён. Бэкенд считает всю сетку слотов в UTC и часовой пояс
 * для ограничения «рабочих часов» НЕ применяет (этого нет в контракте).
 */
export const seedOwner: Owner = {
  id: 'owner-anna',
  name: 'Анна Петрова',
  timeZone: 'Europe/Moscow',
}

/**
 * Стартовые типы событий, чтобы гостевой сценарий работал из коробки.
 * Это начальные данные, а не бизнес-правило; владелец может создавать новые
 * через POST /admin/event-types.
 */
export const seedEventTypes: EventType[] = [
  {
    id: 'intro-call',
    title: 'Вводный звонок',
    description: 'Короткое знакомство и обсуждение задачи.',
    durationInMinutes: 30,
  },
  {
    id: 'consultation-60',
    title: 'Консультация',
    description: 'Развёрнутая консультация по вашему проекту.',
    durationInMinutes: 60,
  },
  {
    id: 'quick-15',
    title: 'Быстрый созвон',
    description: 'Пятнадцать минут на один конкретный вопрос.',
    durationInMinutes: 15,
  },
]
