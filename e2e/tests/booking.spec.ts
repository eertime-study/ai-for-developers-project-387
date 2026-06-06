import { test, expect } from '@playwright/test'

/**
 * Главный сценарий бронирования (шаг 4 проекта).
 * Подробное описание шагов и охвата — см. e2e/scenarios.md.
 */
test('гость бронирует первый available-слот и слот становится booked', async ({ page }) => {
  // 1. Главная — список типов событий из seed.
  await page.goto('/')
  const introCallLink = page.getByRole('link', { name: /Вводный звонок/ })
  await expect(introCallLink).toBeVisible()

  // 2. Выбираем тип «Вводный звонок».
  await introCallLink.click()
  await expect(page).toHaveURL(/\/event-types\/intro-call$/)

  // 3. Первый available-слот в сетке. aria-label = «<DD месяц> <HH:MM> (<status>)».
  const firstAvailable = page.getByRole('button', { name: /\(available\)\s*$/ }).first()
  await expect(firstAvailable).toBeVisible()
  const slotLabel = await firstAvailable.getAttribute('aria-label')
  expect(slotLabel, 'aria-label у кнопки слота должен присутствовать').toBeTruthy()
  // Подпись слота вида «<DD месяц> <HH:MM>» — без хвоста про статус.
  const slotPrefix = slotLabel!.replace(/\s*\((available|booked|past|outside_window)\)\s*$/, '')

  await firstAvailable.click()
  await expect(page).toHaveURL(/\/event-types\/intro-call\/book\?slot=/)

  // 4. Заполняем форму и сабмитим.
  await page.locator('#guestName').fill('Иван Тестов')
  await page.locator('#guestEmail').fill('ivan@test.io')
  await page.getByRole('button', { name: 'Забронировать' }).click()

  // 5. Экран успеха показывает все ключевые данные.
  await expect(page).toHaveURL(/\/bookings\/success$/)
  await expect(page.getByRole('heading', { name: 'Встреча забронирована!' })).toBeVisible()
  await expect(page.getByText('Вводный звонок')).toBeVisible()
  await expect(page.getByText('Иван Тестов')).toBeVisible()
  await expect(page.getByText('ivan@test.io')).toBeVisible()

  // 6. Возврат к типам и повторный заход в сетку — тот же слот теперь booked.
  await page.getByRole('link', { name: 'Вернуться к типам встреч' }).click()
  await expect(page).toHaveURL(/\/$/)
  await page.getByRole('link', { name: /Вводный звонок/ }).click()
  await expect(page).toHaveURL(/\/event-types\/intro-call$/)

  const sameSlotBooked = page.getByRole('button', {
    name: new RegExp(`^${escapeRegex(slotPrefix)}\\s*\\(booked\\)$`),
  })
  await expect(sameSlotBooked).toBeVisible()
})

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
