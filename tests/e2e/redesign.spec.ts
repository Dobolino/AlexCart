import { test, expect, type Page } from '@playwright/test'

async function seed(page: Page) {
  await page.addInitScript(() => {
    if (localStorage.getItem('alexshop-store')) return
    const now = Date.now(),
      yesterday = now - 86400000
    const date = new Date(yesterday).toLocaleDateString('sv-SE')
    localStorage.setItem(
      'alexshop-store',
      JSON.stringify({
        version: 26,
        state: {
          lists: [
            {
              id: 'redesign',
              name: 'Wocheneinkauf für die ganze Familie – Migros Bahnhof und Deutschland',
              createdAt: yesterday,
              weekLabel: '',
              items: [
                {
                  id: 'milk',
                  name: 'Milch',
                  category: 'Milch & Käse',
                  amount: '1 l',
                  done: true,
                  purchaseLogId: 'paid-milk',
                  addedAt: yesterday,
                },
                {
                  id: 'bread',
                  name: 'Brot',
                  category: 'Brot & Backwaren',
                  amount: '1 Stück',
                  productId: 'bread-product',
                  done: false,
                  addedAt: now,
                },
                {
                  id: 'apple',
                  name: 'Äpfel',
                  category: 'Früchte & Gemüse',
                  amount: '500 g',
                  done: false,
                  addedAt: now,
                },
              ],
            },
          ],
          activeListId: 'redesign',
          shoppingSession: {
            listId: 'redesign',
            store: 'Migros Bahnhof',
            storeId: 'CH:migros',
            currency: 'CHF',
            startedAt: yesterday,
            totalPausedMs: 0,
            checkedItemIds: ['milk'],
          },
          settings: {
            currency: 'CHF',
            theme: 'light',
            hasSeenOnboarding: true,
            listViewMode: 'tiles',
            askPriceOnCheckoff: true,
            shoppingAutoCollapse: false,
            weeklyBudget: 100,
            listStoreIds: { redesign: 'CH:migros' },
          },
          purchaseLog: [
            {
              id: 'paid-milk',
              itemId: 'milk',
              name: 'Milch',
              category: 'Milch & Käse',
              amount: '1 l',
              price: 2,
              currency: 'CHF',
              date,
              storeId: 'CH:migros',
            },
          ],
          calculatorDate: new Date(now).toLocaleDateString('sv-SE'),
          calculatorEntries: [{ id: 'scratch', amount: 100, currency: 'CHF', addedAt: now }],
          calculatorExcludedPurchaseIds: ['paid-milk'],
          retailStores: [
            { id: 'CH:migros', retailerId: 'migros', name: 'Migros Bahnhof', country: 'CH', currency: 'CHF' },
            {
              id: 'DE:marktkauf',
              retailerId: 'marktkauf',
              name: 'Marktkauf Konstanz',
              country: 'DE',
              currency: 'EUR',
            },
          ],
          catalog: [
            {
              id: 'bread-product',
              name: 'Brot',
              brand: 'Testbäckerei',
              gtins: [],
              category: 'Brot & Backwaren',
              netQuantity: { value: 1, unit: 'piece' },
              source: 'manual',
              updatedAt: new Date(now).toISOString(),
            },
          ],
          priceObservations: [
            {
              id: 'bread-ch',
              productId: 'bread-product',
              storeId: 'CH:migros',
              basis: 'package',
              price: { minor: 400, currency: 'CHF' },
              source: 'receipt',
              observedAt: new Date(now - 10000).toISOString(),
            },
            {
              id: 'bread-de',
              productId: 'bread-product',
              storeId: 'DE:marktkauf',
              basis: 'package',
              price: { minor: 200, currency: 'EUR' },
              source: 'manual',
              observedAt: new Date(now - 10000).toISOString(),
            },
            {
              id: 'bread-sale',
              productId: 'bread-product',
              storeId: 'DE:marktkauf',
              basis: 'package',
              price: { minor: 50, currency: 'EUR' },
              source: 'manual',
              discounted: true,
              observedAt: new Date(now - 5000).toISOString(),
            },
          ],
          fxSnapshot: {
            id: 'fx',
            base: 'EUR',
            quote: 'CHF',
            quotePerBase: '0.95',
            rateDate: date,
            fetchedAt: new Date(now).toISOString(),
            source: 'Eigener Kurs',
          },
        },
      })
    )
  })
  await page.goto('/AlexCart/')
}
const stored = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('alexshop-store')!).state)

test('budget separates weekly purchases, estimates and calculator notes, including an overnight session', async ({
  page,
}) => {
  await seed(page)
  const costs = page.getByRole('region', { name: 'Kosten und Wochenbudget' })
  await expect(costs).toContainText('Rechnernotizen: CHF 100.00')
  await expect(costs).toContainText('CHF 2.00')
  await expect(costs).toContainText('CHF 4.00')
  await expect(costs).toContainText('1 ohne Preisschätzung')
  await expect(costs).toContainText('CHF 98.00 Wochenbudget übrig')
  await expect(costs).toContainText('CHF 94.00 übrig')
  await page.getByRole('button', { name: 'Einkaufsmodus starten', exact: true }).click()
  const total = page.getByRole('region', { name: 'Aktueller Einkauf' })
  await expect(total).toContainText('CHF 2.00')
  await expect(total).toContainText('CHF 6.00')
  await expect(page.getByRole('region', { name: 'Im Wagen', exact: true })).toContainText('Milch')
})

test('unpriced purchases remain accessible and completion can reprice, carry selected rows and preserve history', async ({
  page,
}) => {
  await seed(page)
  await page.getByRole('button', { name: 'Einkaufsmodus starten', exact: true }).click()
  await page.getByRole('button', { name: 'Brot ohne Preis kaufen', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Im Wagen', exact: true })).toContainText('Preis fehlt')
  expect(
    (await stored(page)).purchaseLog.find((entry: { itemId: string }) => entry.itemId === 'bread').price
  ).toBeUndefined()
  await page.getByRole('button', { name: 'Abschließen', exact: true }).click()
  const finish = page.getByRole('dialog', { name: 'Einkauf abschließen?', exact: true })
  await finish.getByRole('button', { name: 'Preis für Brot nachtragen', exact: true }).click()
  const price = page.getByRole('dialog').filter({ hasText: 'Preis erfassen' })
  for (const key of ['3', '5', '0'])
    await price.getByRole('button', { name: `Ziffer ${key}`, exact: true }).click()
  await price.getByRole('button', { name: 'Speichern', exact: true }).click()
  await expect(finish).toContainText('CHF 5.50 bestätigt')
  await finish.getByRole('checkbox', { name: 'Äpfel auf nächste Liste', exact: true }).check()
  await finish.getByRole('button', { name: 'Abschließen & neue Liste', exact: true }).click()
  const state = await stored(page)
  expect(state.completedTrips).toHaveLength(1)
  expect(state.completedTrips[0].items).toHaveLength(2)
  expect(state.purchaseLog).toHaveLength(2)
  expect(state.lists.find((list: { id: string }) => list.id === state.activeListId).items).toMatchObject([
    { name: 'Äpfel', done: false },
  ])
  expect(state.shoppingSession).toBeNull()
  await expect(page.getByRole('status')).toContainText('CHF 5.50')
})

test('price country filters keep named stores and normal prices separate from promotions', async ({
  page,
}) => {
  await seed(page)
  await page.getByRole('link', { name: 'Preise', exact: true }).click()
  await expect(
    page.getByText('Marktkauf Konstanz 53 % günstiger als Migros Bahnhof', { exact: true })
  ).toBeVisible()
  await page.getByRole('tab', { name: 'Schweiz', exact: true }).click()
  await expect(page.locator('article')).toHaveCount(1)
  await expect(page.locator('article')).toContainText('Migros Bahnhof')
  await page.getByRole('tab', { name: 'Deutschland', exact: true }).click()
  await expect(page.locator('article')).toHaveCount(2)
  await expect(page.locator('article').first()).toContainText('Marktkauf Konstanz')
  await expect(page.locator('article').first()).toContainText('2,00 €')
  await expect(page.locator('article').last()).toContainText('Aktionspreis')
  await expect(page.getByText(/Kursdatum/).first()).toBeVisible()
})

test('a historical price is only prefilled on request and paid after explicit confirmation', async ({
  page,
}) => {
  await seed(page)
  await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem('alexshop-store')!)
    data.state.priceProfiles = [
      {
        id: 'bread-profile',
        itemName: 'Brot',
        category: 'Brot & Backwaren',
        baseKey: 'brot|brot & backwaren',
        createdAt: 1,
        updatedAt: 1,
        variants: [
          {
            id: 'bread-standard',
            name: 'Standard',
            lastPrice: 4,
            purchaseCount: 1,
            salePurchaseCount: 0,
            lastPurchaseWasSale: false,
          },
        ],
      },
    ]
    localStorage.setItem('alexshop-store', JSON.stringify(data))
  })
  await page.reload()
  await page.getByRole('button', { name: 'Einkaufsmodus starten', exact: true }).click()
  await page.getByRole('button', { name: 'Brot abhaken', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.locator('.money-display')).toContainText('CHF 0.00')
  await dialog.getByRole('button', { name: /Wie zuletzt übernehmen/ }).click()
  await expect(dialog.locator('.money-display')).toContainText('CHF 4.00')
  expect((await stored(page)).purchaseLog).toHaveLength(1)
  await dialog.getByRole('button', { name: 'Schließen', exact: true }).click()
  expect((await stored(page)).purchaseLog).toHaveLength(1)
  await page.getByRole('button', { name: 'Brot abhaken', exact: true }).click()
  await expect(dialog.locator('.money-display')).toContainText('CHF 0.00')
  await dialog.getByRole('button', { name: /Wie zuletzt übernehmen/ }).click()
  await dialog.getByRole('button', { name: 'Speichern', exact: true }).click()
  expect(
    (await stored(page)).purchaseLog.find((entry: { itemId: string }) => entry.itemId === 'bread').price
  ).toBe(4)
})

test('best match offers quantity choice and a true variant without duplicating the product', async ({
  page,
}) => {
  await seed(page)
  await page.getByRole('button', { name: 'Artikel hinzufügen', exact: true }).click()
  await page.getByRole('searchbox', { name: 'Artikelsuche', exact: true }).fill('Brot')
  await expect(page.getByRole('heading', { name: 'Bester Treffer', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: /als neues Produkt anlegen/ })).toHaveCount(0)
  await page.getByRole('button', { name: 'Suchmenge erhöhen', exact: true }).click()
  await page.getByRole('button', { name: 'Eigene Variante von „Brot“ anlegen', exact: false }).click()
  await page.getByLabel('Name der Variante', { exact: true }).fill('Bio 500 g')
  await page.getByRole('dialog').getByRole('button', { name: 'Variante hinzufügen', exact: true }).click()
  const state = await stored(page)
  expect(state.customProducts).toEqual([])
  expect(state.catalog).toHaveLength(1)
  expect(
    state.priceProfiles.find((profile: { itemName: string }) => profile.itemName === 'Brot').variants
  ).toMatchObject([{ name: 'Bio 500 g', purchaseCount: 0 }])
  expect(state.purchaseLog).toHaveLength(1)
})

test('long titles, light and dark surfaces and safe areas fit 320, 390 and 430px', async ({ page }) => {
  await seed(page)
  await page.addStyleTag({ content: ':root { --safe-bottom: 34px; }' })
  for (const theme of ['light', 'dark']) {
    await page.locator('html').evaluate((element, value) => element.setAttribute('data-theme', value), theme)
    for (const width of [320, 390, 430]) {
      await page.setViewportSize({ width, height: 844 })
      const start = await page
        .getByRole('button', { name: 'Einkaufsmodus starten', exact: true })
        .boundingBox()
      const title = await page.locator('h1').boundingBox()
      const actions = await page.getByRole('toolbar', { name: 'Artikel verwalten' }).boundingBox()
      const nav = await page.getByRole('navigation', { name: 'Hauptnavigation' }).boundingBox()
      expect(title!.x + title!.width).toBeLessThanOrEqual(start!.x)
      expect(actions!.y + actions!.height).toBeLessThanOrEqual(nav!.y)
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width)
    }
  }
})
