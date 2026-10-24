import { test, expect, type Page } from '@playwright/test'

test.use({ hasTouch: true })

async function seed(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem(
      'alexshop-store',
      JSON.stringify({
        version: 20,
        state: {
          lists: [
            {
              id: 'mobile',
              name: 'Migros',
              weekLabel: '',
              createdAt: 1,
              items: [
                {
                  id: 'milk',
                  name: 'Milch',
                  category: 'Milch & Käse',
                  amount: '1 l',
                  done: false,
                  addedAt: 1,
                },
                {
                  id: 'potato',
                  name: 'Kartoffeln festkochend (Rezeptbedarf gerundet)',
                  category: 'Früchte & Gemüse',
                  amount: '600 g',
                  done: false,
                  addedAt: 2,
                },
              ],
            },
          ],
          activeListId: 'mobile',
          pantry: [{ id: 'garlic', name: 'Knoblauch', category: 'Früchte & Gemüse', amount: '1 Knolle' }],
          settings: {
            hasSeenOnboarding: true,
            theme: 'dark',
            listViewMode: 'tiles',
            askPriceOnCheckoff: true,
            weeklyBudget: 100,
            currency: 'CHF',
          },
        },
      })
    )
  })
  await page.goto('http://127.0.0.1:8788/AlexCart/')
  await expect(page.locator('[data-item-id="milk"]')).toBeVisible()
}

async function opacity(page: Page, text: string) {
  return page
    .getByText(text, { exact: true })
    .first()
    .evaluate((element) => {
      let value = 1
      for (let node: Element | null = element; node; node = node.parentElement)
        value *= Number(getComputedStyle(node).opacity)
      return value
    })
}

test('tile remains visible after cancelling price entry and supports skip and undo', async ({ page }) => {
  await seed(page)
  await page.getByText('Milch', { exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('dialog').getByRole('button', { name: 'Schließen', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect.poll(() => opacity(page, 'Milch')).toBeGreaterThan(0.99)
  await page.getByText('Milch', { exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Ohne Preis abhaken', exact: true }).click()
  await page.getByRole('button', { name: 'Rückgängig', exact: true }).click()
  await expect(page.locator('[data-item-id="milk"]')).toBeVisible()
  await expect.poll(() => opacity(page, 'Milch')).toBeGreaterThan(0.99)
  await page.getByRole('button', { name: 'Aktionen für Milch', exact: true }).click()
  await expect(page.getByRole('dialog')).toContainText('Milch')
  await page.getByRole('dialog').getByRole('button', { name: 'Schließen', exact: true }).click()
  await page.getByRole('link', { name: 'Vorrat', exact: true }).click()
  await page.getByRole('link', { name: 'Liste', exact: true }).click()
  await expect.poll(() => opacity(page, 'Milch')).toBeGreaterThan(0.99)
})

test('content and list actions remain above navigation at narrow widths and with safe areas', async ({
  page,
}) => {
  await seed(page)
  await page.addStyleTag({ content: ':root { --safe-bottom: 34px; }' })
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 740 })
    const nav = await page.getByRole('navigation', { name: 'Hauptnavigation' }).boundingBox()
    const main = await page.locator('main').boundingBox()
    const add = await page.getByRole('button', { name: 'Artikel hinzufügen', exact: true }).boundingBox()
    const scan = await page.getByRole('button', { name: 'Scannen', exact: true }).boundingBox()
    expect(main!.y + main!.height).toBeLessThanOrEqual(add!.y)
    expect(add!.y + add!.height).toBeLessThanOrEqual(nav!.y)
    expect(scan!.y + scan!.height).toBeLessThanOrEqual(nav!.y)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width)
  }
})

test('pantry shows stock first and permits adding through a labelled dialog', async ({ page }) => {
  await seed(page)
  await page.getByRole('link', { name: 'Vorrat', exact: true }).click()
  await expect(page.getByText('Knoblauch', { exact: true })).toBeVisible()
  await page.getByText('Knoblauch', { exact: true }).tap()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.setViewportSize({ width: 390, height: 440 })
  const save = page.getByRole('dialog').getByRole('button', { name: 'Speichern', exact: true })
  await save.scrollIntoViewIfNeeded()
  await expect(save).toBeInViewport()
  await save.tap()
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.getByPlaceholder('z.B. Milch')).toHaveCount(0)
  await page.getByRole('button', { name: 'Vorratsartikel hinzufügen', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Produktname', { exact: true }).fill('Haferdrink')
  await dialog.getByLabel('Bestand', { exact: true }).fill('2')
  await dialog.getByRole('button', { name: 'Hinzufügen', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await expect(page.getByText('Haferdrink', { exact: true })).toBeVisible()
  await page.getByPlaceholder('Vorrat durchsuchen').fill('Knob')
  await expect(page.getByText('Knoblauch', { exact: true })).toBeVisible()
  await expect(page.getByText('Haferdrink', { exact: true })).toHaveCount(0)
})

test('touch controls and swiping do not check a product accidentally', async ({ page }) => {
  await seed(page)
  await page.getByRole('button', { name: 'Aktionen für Milch', exact: true }).tap()
  await expect(page.getByRole('dialog')).toContainText('Favorisieren')
  await page.getByRole('dialog').getByRole('button', { name: 'Schließen', exact: true }).tap()
  await page.getByRole('button', { name: 'Milch Menge erhöhen', exact: true }).tap()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByText('1,5 l', { exact: true })).toBeVisible()
  const title = page.getByText('Milch', { exact: true })
  const bounds = await title.boundingBox()
  const x = bounds!.x + bounds!.width - 5
  const y = bounds!.y + bounds!.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x - 95, y, { steps: 10 })
  await page.mouse.up()
  const remove = page.locator('[data-item-id="milk"]').getByRole('button', { name: 'Löschen', exact: true })
  await expect(remove).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await title.tap()
  await expect(remove).toHaveCount(0)
  await expect.poll(() => opacity(page, 'Milch')).toBeGreaterThan(0.99)
  await title.tap()
  await expect(page.getByRole('dialog')).toContainText('Preis erfassen')
})
