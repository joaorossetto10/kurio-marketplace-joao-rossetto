import { expect, test } from '@playwright/test'

test('a base React executa e continua acessível após refresh', async ({
  page,
}) => {
  const runtimeErrors: string[] = []

  page.on('pageerror', (error) => runtimeErrors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') runtimeErrors.push(message.text())
  })

  await page.goto('/')
  await expect(page).toHaveTitle('Kurio | Marketplace de NFTs')
  await expect(page.getByRole('main')).toBeVisible()
  await expect(
    page.getByRole('heading', { name: /SEJA DONO/, level: 1 }),
  ).toBeVisible()

  await page.reload()
  await expect(
    page.getByRole('heading', { name: 'Todos os NFTs', level: 2 }),
  ).toBeVisible()

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  )

  expect(hasHorizontalOverflow).toBe(false)
  expect(runtimeErrors).toEqual([])
})
