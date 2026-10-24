import { test, expect, type Page } from '@playwright/test'

async function open(page: Page) {
  await page.goto('http://127.0.0.1:8788/AlexCart/')
  const start = page.getByRole('button', { name: "Los geht's", exact: true })
  if (await start.isVisible()) await start.click()
  await expect(page.getByRole('button', { name: 'Artikel hinzufügen', exact: true }).first()).toBeVisible()
}
async function add(page: Page, name: string) {
  await page.getByRole('button', { name: 'Artikel hinzufügen', exact: true }).first().click()
  await page.getByPlaceholder('z.B. Tomaten').fill(name)
  await page.getByRole('dialog').getByRole('button').filter({ hasText: name }).first().click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
}

test('quick add, accessible dialogs, responsive header, undo and offline root reload', async ({
  page,
  context,
}) => {
  await open(page)
  await add(page, 'Milch')
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 })
    const bounds = await page
      .locator('header button')
      .evaluateAll((buttons) => buttons.map((button) => button.getBoundingClientRect().right))
    expect(Math.max(...bounds)).toBeLessThanOrEqual(width)
  }
  await page.getByRole('button', { name: 'Artikel hinzufügen', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Tab')
  expect(await page.evaluate(() => !!document.activeElement?.closest('dialog'))).toBe(true)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('button', { name: 'Milch abhaken', exact: true }).click()
  await page.getByRole('button', { name: 'Rückgängig', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Milch abhaken', exact: true })).toBeVisible()
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('button', { name: 'Milch abhaken', exact: true })).toBeVisible()
  await context.setOffline(false)
})

test('camera fallback stores unknown barcode locally and permits a unit-price comparison', async ({
  page,
}) => {
  await open(page)
  await page.getByRole('button', { name: 'Scannen', exact: true }).click()
  const scanner = page.getByRole('dialog')
  await scanner.getByLabel('Barcode', { exact: true }).fill('4006381333931')
  await scanner.getByLabel('Produktname', { exact: true }).fill('Testmilch')
  await scanner.getByLabel('Menge', { exact: true }).fill('1 l')
  await scanner.getByRole('button', { name: 'Zur Liste hinzufügen', exact: true }).click()
  await expect(scanner).toHaveCount(0)
  await page.getByRole('link', { name: 'Preise', exact: true }).click()
  await page.getByLabel('Packungsinhalt', { exact: true }).fill('1 l')
  await page.getByRole('button', { name: 'Inhalt speichern', exact: true }).click()
  await page.getByLabel('Preis pro Packung', { exact: true }).fill('1.90')
  await page.getByRole('button', { name: 'Preis speichern', exact: true }).click()
  await expect(page.getByText('CHF 1.90 / l', { exact: true })).toBeVisible()
  await page.getByText('Wechselkurs EUR → CHF', { exact: true }).click()
  await page.getByLabel('Oder eigenen Kurs festlegen: 1 EUR in CHF').fill('0.95')
  await page.getByRole('button', { name: 'Eigenen Kurs speichern', exact: true }).click()
  await expect(page.getByText(/1 EUR = 0.95 CHF/)).toBeVisible()
})

test('shared list preserves both devices changes and queued offline edits after reload', async ({
  browser,
}) => {
  const a = await browser.newContext({
    viewport: { width: 390, height: 844 },
    permissions: ['clipboard-read', 'clipboard-write'],
  })
  const b = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const first = await a.newPage(),
    second = await b.newPage()
  await open(first)
  await add(first, 'Milch')
  await first.getByRole('button', { name: 'Liste teilen', exact: true }).click()
  await first.getByRole('button', { name: 'Diese Liste freigeben', exact: true }).click()
  await first.getByRole('button', { name: 'Einladungslink kopieren', exact: true }).click()
  const invite = await first.evaluate(() => navigator.clipboard.readText())
  await first.keyboard.press('Escape')
  await second.goto(invite)
  const onboarding = second.getByRole('button', { name: "Los geht's", exact: true })
  if (await onboarding.isVisible()) await onboarding.click()
  await second.getByRole('button', { name: 'Einladung annehmen', exact: true }).click()
  await expect(second.getByRole('button', { name: 'Milch abhaken', exact: true })).toBeVisible()
  await first.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  await first.getByRole('button', { name: 'Einkaufsmodus starten', exact: true }).click()
  await a.setOffline(true)
  await first.getByRole('button', { name: 'Milch Menge erhöhen', exact: true }).click()
  await first.reload()
  await expect(first.getByRole('button', { name: 'Milch Menge erhöhen', exact: true })).toBeVisible()
  await second.getByRole('button', { name: 'Einkaufsmodus starten', exact: true }).click()
  await second.getByRole('button', { name: 'Milch Menge erhöhen', exact: true }).click()
  await second.getByRole('button', { name: 'Zur Liste', exact: true }).click()
  await second.getByRole('button', { name: 'Liste teilen', exact: true }).click()
  await second.getByRole('button', { name: 'Jetzt abgleichen', exact: true }).click()
  await expect(second.getByRole('status').filter({ hasText: 'Alle Änderungen bestätigt' })).toBeVisible()
  await a.setOffline(false)
  await first.getByRole('button', { name: 'Zur Liste', exact: true }).click()
  await first.getByRole('button', { name: 'Liste teilen', exact: true }).click()
  await first.getByRole('button', { name: 'Jetzt abgleichen', exact: true }).click()
  await expect(first.getByRole('status').filter({ hasText: 'Alle Änderungen bestätigt' })).toBeVisible()
  await first.keyboard.press('Escape')
  await first.getByRole('button', { name: 'Einkaufsmodus starten', exact: true }).click()
  await first.getByRole('button', { name: 'Fortsetzen', exact: true }).click()
  await expect(first.getByText('2 l', { exact: true })).toBeVisible()
  await a.close()
  await b.close()
})

test('storage failures are visible and malformed persisted data is preserved for recovery', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'alexshop-store',
      JSON.stringify({ version: 20, state: { lists: [{ id: 'broken', items: [null] }] } })
    )
  )
  await page.goto('http://127.0.0.1:8788/AlexCart/')
  await expect(page.getByRole('alert')).toContainText('Originaldaten bleiben erhalten')
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('alexshop-store')!).state.lists[0].items[0])
  ).toBeNull()
})
