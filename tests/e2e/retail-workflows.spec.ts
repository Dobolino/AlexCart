import { test, expect, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'

test.use({ hasTouch: true })
async function open(page: Page, priced = false) {
  await page.addInitScript(
    ({ priced }) => {
      if (localStorage.getItem('alexshop-store')) return
      localStorage.setItem(
        'alexshop-store',
        JSON.stringify({
          version: 20,
          state: {
            lists: [
              {
                id: 'retail',
                name: 'Migros',
                weekLabel: '',
                createdAt: 1,
                items: ['a', 'b'].map((id) => ({
                  id,
                  name: 'Shampoo',
                  category: 'Drogerie & Kosmetik',
                  amount: '1 Stück',
                  done: false,
                  addedAt: 1,
                })),
              },
            ],
            activeListId: 'retail',
            pantry: [],
            settings: {
              currency: 'CHF',
              listViewMode: 'tiles',
              hasSeenOnboarding: true,
              askPriceOnCheckoff: true,
              theme: 'dark',
            },
            purchaseLog: priced
              ? [
                  {
                    id: 'ch',
                    name: 'Milch',
                    category: 'Milch & Käse',
                    amount: '1 l',
                    date: '2026-10-24',
                    currency: 'CHF',
                    price: 2,
                    storeId: 'CH:migros',
                  },
                  {
                    id: 'de',
                    name: 'Milch',
                    category: 'Milch & Käse',
                    amount: '1 l',
                    date: '2026-10-24',
                    currency: 'EUR',
                    price: 1.2,
                    storeId: 'DE:edeka',
                  },
                ]
              : [],
            retailStores: [
              { id: 'CH:migros', name: 'Migros', country: 'CH', retailerId: 'migros', currency: 'CHF' },
              { id: 'DE:edeka', name: 'Edeka', country: 'DE', retailerId: 'edeka', currency: 'EUR' },
            ],
          },
        })
      )
    },
    { priced }
  )
  await page.goto('http://127.0.0.1:8788/AlexCart/')
  await expect(page.locator('[data-item-id="a"]')).toBeVisible()
}
test('paused shopping really resumes and store countries remain separated', async ({ page }) => {
  await open(page)
  await page.getByRole('button', { name: 'Einkaufsmodus starten', exact: true }).click()
  await page.getByRole('button', { name: 'Zur Liste', exact: true }).click()
  await page.getByRole('button', { name: 'Einkaufsmodus starten', exact: true }).click()
  await expect(page.getByRole('dialog')).toContainText('Einkauf pausiert')
  await page.getByRole('button', { name: 'Fortsetzen', exact: true }).tap()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('alexshop-store')!).state.shoppingSession.pausedAt
    )
  ).toBeUndefined()
  await page.getByRole('button').filter({ hasText: 'Schweiz · Migros · Laufweg' }).click()
  const market = page.getByRole('dialog')
  await market.getByLabel('Einkaufsland', { exact: true }).selectOption('DE')
  await expect(market.getByLabel('Supermarkt', { exact: true })).toHaveValue('edeka')
  expect(
    await market.getByLabel('Supermarkt', { exact: true }).locator('option').allTextContents()
  ).not.toContain('Migros')
  await market.getByRole('button', { name: 'Geschäft übernehmen', exact: true }).click()
  await expect(page.getByRole('button').filter({ hasText: 'Deutschland · Edeka · Laufweg' })).toBeVisible()
})
test('brand picker keeps manufacturer brands across countries and saves the selected store and currency', async ({
  page,
}) => {
  await open(page)
  await page
    .locator('[data-item-id="a"]')
    .getByRole('button', { name: 'Shampoo abhaken', exact: true })
    .click()
  const price = page.getByRole('dialog', { name: 'Preis erfassen', exact: true })
  await expect(price.getByLabel('Einkaufsland', { exact: true })).toHaveValue('CH')
  await price.getByRole('button', { name: 'Marke auswählen', exact: true }).click()
  const initialBrands = page.getByRole('dialog', { name: 'Marke auswählen', exact: true })
  await initialBrands.getByRole('searchbox', { name: 'Markensuche', exact: true }).fill('I am')
  await initialBrands.getByRole('button', { name: 'I am', exact: true }).click()
  await price.getByRole('button', { name: 'Ziffer 1', exact: true }).tap()
  await price.getByLabel('Einkaufsland', { exact: true }).selectOption('DE')
  await expect(price.getByRole('button', { name: 'Marke auswählen', exact: true })).not.toContainText('I am')
  await expect(price.locator('.money-display')).toContainText('0,00')
  await price.getByLabel('Einkaufsland', { exact: true }).selectOption('CH')
  await price.getByRole('button', { name: 'Marke auswählen', exact: true }).click()
  let brands = page.getByRole('dialog', { name: 'Marke auswählen', exact: true })
  await expect(brands.getByRole('region', { name: 'Allgemeine Marken · beide Länder' })).toBeVisible()
  await page.setViewportSize({ width: 390, height: 440 })
  await brands.getByRole('searchbox', { name: 'Markensuche', exact: true }).fill('Nivea')
  await expect(brands.getByRole('button', { name: 'Nivea', exact: true })).toBeInViewport()
  await brands.getByRole('button', { name: 'Nivea', exact: true }).click()
  await page.setViewportSize({ width: 390, height: 844 })
  await price.getByRole('button', { name: 'Ziffer 1', exact: true }).tap()
  await price.getByLabel('Einkaufsland', { exact: true }).selectOption('DE')
  await expect(price.locator('.money-display')).toContainText('0,00')
  await expect(price.getByLabel('Supermarkt', { exact: true })).toHaveValue('edeka')
  await expect(price.getByRole('button', { name: 'Marke auswählen', exact: true })).toContainText('Nivea')
  await price.getByRole('button', { name: 'Marke auswählen', exact: true }).click()
  brands = page.getByRole('dialog', { name: 'Marke auswählen', exact: true })
  await brands.getByRole('searchbox', { name: 'Markensuche', exact: true }).fill('Gut')
  await expect(
    brands
      .getByRole('region', { name: 'Eigenmarken · Edeka', exact: true })
      .getByRole('button', { name: 'Gut & Günstig', exact: true })
  ).toBeVisible()
  await expect(brands.getByRole('button', { name: 'M Classic', exact: true })).toHaveCount(0)
  await brands.getByRole('button', { name: 'Fertig', exact: true }).click()
  for (const key of ['2', '4', '9'])
    await price.getByRole('button', { name: `Ziffer ${key}`, exact: true }).tap()
  await price.getByRole('button', { name: 'Speichern', exact: true }).tap()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem('alexshop-store')!).state)
  expect(state.purchaseLog[0]).toMatchObject({
    price: 2.49,
    currency: 'EUR',
    storeId: 'DE:edeka',
    amount: '1 Stück',
  })
  expect(state.brands.find((b: { name: string }) => b.name === 'Nivea')).toBeTruthy()
  await page
    .locator('[data-item-id="b"]')
    .getByRole('button', { name: 'Shampoo abhaken', exact: true })
    .click()
  const secondPrice = page.getByRole('dialog', { name: 'Preis erfassen', exact: true })
  await expect(secondPrice.getByLabel('Einkaufsland', { exact: true })).toHaveValue('CH')
  await secondPrice.getByRole('button', { name: 'Marke auswählen', exact: true }).click()
  const secondBrands = page.getByRole('dialog', { name: 'Marke auswählen', exact: true })
  await secondBrands.getByRole('searchbox', { name: 'Markensuche', exact: true }).fill('I am')
  await secondBrands.getByRole('button', { name: 'I am', exact: true }).click()
  for (const key of ['3', '9', '9'])
    await secondPrice.getByRole('button', { name: `Ziffer ${key}`, exact: true }).tap()
  await secondPrice.getByRole('button', { name: 'Speichern', exact: true }).tap()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  const corrected = await page.evaluate(() => JSON.parse(localStorage.getItem('alexshop-store')!).state)
  expect(corrected.purchaseLog.map((e: { currency: string }) => e.currency).sort()).toEqual(['CHF', 'EUR'])
  expect(corrected.priceProfiles[0].variants).toHaveLength(2)
  expect(new Set(corrected.priceProfiles[0].variants.map((v: { brandId: string }) => v.brandId)).size).toBe(2)
})

test('brand favorites and hidden entries persist and common brands remain independent of country', async ({
  page,
}) => {
  await open(page)
  await page.getByRole('link', { name: 'Optionen', exact: true }).click()
  await page.getByRole('button', { name: 'Preise & Marken', exact: true }).click()
  await page.getByRole('button', { name: 'Markenkatalog verwalten', exact: true }).click()
  const catalog = page.getByRole('dialog', { name: 'Marken verwalten', exact: true })
  await catalog.getByRole('searchbox', { name: 'Markensuche', exact: true }).fill('loreal')
  const common = catalog.getByRole('region', { name: 'Allgemeine Marken · beide Länder' })
  await common.getByRole('button', { name: 'L’Oréal Paris merken', exact: true }).click()
  await common.getByRole('button', { name: 'L’Oréal Paris ausblenden', exact: true }).click()
  await catalog.getByLabel('Ausgeblendete Marken anzeigen').check()
  await common.getByRole('button', { name: 'L’Oréal Paris einblenden', exact: true }).click()
  await catalog.getByLabel('Einkaufsland', { exact: true }).selectOption('DE')
  await expect(
    common.getByRole('button', { name: 'L’Oréal Paris nicht mehr merken', exact: true })
  ).toBeVisible()
  await catalog.getByRole('button', { name: 'Fertig', exact: true }).click()
  await page.reload()
  const settings = await page.evaluate(
    () => JSON.parse(localStorage.getItem('alexshop-store')!).state.settings
  )
  expect(settings.favoriteBrandNames).toContain('L’Oréal Paris')
  expect(settings.hiddenBrandNames).not.toContain('L’Oréal Paris')
  expect(settings.retailSelection).toEqual({ country: 'DE', retailerId: 'edeka' })
})
test('import previews text and files before changing a list and has one receipt entry', async ({ page }) => {
  await open(page)
  await page.getByRole('button', { name: 'Artikel hinzufügen', exact: true }).click()
  await page.getByRole('button', { name: 'Import', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('button', { name: 'Kassenbon · Foto / PDF', exact: true })).toHaveCount(1)
  await dialog.getByLabel('Liste oder JSON', { exact: true }).fill('1 l Milch\n500 g Tomaten')
  await expect(dialog.getByRole('heading', { name: 'Vorschau · 2 Artikel', exact: true })).toBeVisible()
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('alexshop-store')!).state.lists[0].items.length)
  ).toBe(2)
  await dialog.getByLabel('JSON-Datei importieren', { exact: true }).setInputFiles({
    name: 'test.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ items: [{ name: 'Haferdrink', amount: '1 l' }] })),
  })
  await expect(dialog.getByRole('heading', { name: 'Vorschau · 1 Artikel', exact: true })).toBeVisible()
  await page.setViewportSize({ width: 390, height: 540 })
  await dialog.getByRole('button', { name: '1 Artikel übernehmen', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await expect(page.getByText('Haferdrink', { exact: true })).toBeVisible()
})
test('JSON price export contains both original currencies and supports AI analysis', async ({ page }) => {
  await open(page, true)
  await page.getByRole('link', { name: 'Preise', exact: true }).click()
  await page.getByRole('button', { name: 'Preise exportieren', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByLabel('Länder im Export')).toHaveValue('ALL')
  const download = page.waitForEvent('download')
  await dialog.getByRole('button', { name: 'JSON für KI exportieren', exact: true }).click()
  const file = await download
  const data = JSON.parse(readFileSync((await file.path())!, 'utf8'))
  expect(data.schemaVersion).toBe(2)
  expect(data.records).toHaveLength(2)
  expect(data.records.map((r: { price: { currency: string } }) => r.price.currency).sort()).toEqual([
    'CHF',
    'EUR',
  ])
  expect(data.records.map((r: { store: string }) => r.store).sort()).toEqual(['Edeka', 'Migros'])
  expect(JSON.stringify(data)).not.toContain('Einladung')
})
