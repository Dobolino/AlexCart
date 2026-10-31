import { test, expect, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'

test.use({ hasTouch: true })
async function legacySession(page: Page, priced = false, completed = false) {
  await page.addInitScript(
    ({ priced, completed }) => {
      if (localStorage.getItem('alexshop-store')) return
      const now = Date.now()
      const date = new Date(now).toISOString().slice(0, 10)
      const items = Array.from({ length: 15 }, (_, i) => ({
        id: `item-${i}`,
        name: i === 0 ? 'Milch' : `Artikel ${i}`,
        category: 'Milch & Käse',
        amount: '1 Stück',
        done: i < 13,
        purchaseLogId: i < 13 ? `purchase-${i}` : undefined,
        addedAt: now,
      }))
      localStorage.setItem(
        'alexshop-store',
        JSON.stringify({
          version: 21,
          state: {
            lists: [{ id: 'list', name: 'Migros', weekLabel: '', items, createdAt: now }],
            activeListId: 'list',
            settings: {
              currency: completed ? 'EUR' : 'CHF',
              theme: 'dark',
              listViewMode: 'tiles',
              weeklyBudget: 100,
              budgetsByCurrency: { CHF: 100, EUR: 80 },
              hasSeenOnboarding: true,
              askPriceOnCheckoff: true,
            },
            shoppingSession: completed
              ? null
              : {
                  listId: 'list',
                  startedAt: now - 60000,
                  currency: 'EUR',
                  totalPausedMs: 0,
                  checkedItemIds: items.slice(0, 13).map((item) => item.id),
                  ...(priced ? { store: 'Edeka', storeId: 'DE:edeka' } : {}),
                },
            purchaseLog: items.slice(0, 13).map((item, i) => ({
              id: item.purchaseLogId,
              itemId: item.id,
              productId: i === 0 ? 'milk' : undefined,
              name: item.name,
              category: item.category,
              amount: item.amount,
              date,
              currency: 'EUR',
              ...(priced && i === 0 ? { price: 2.49, profilePrice: 2.49, storeId: 'DE:edeka' } : {}),
            })),
            retailStores: [
              { id: 'DE:edeka', name: 'Edeka', country: 'DE', currency: 'EUR', retailerId: 'edeka' },
            ],
            catalog: [
              {
                id: 'milk',
                name: 'Milch',
                category: 'Milch & Käse',
                gtins: [],
                netQuantity: { value: 1000, unit: 'ml' },
                source: 'manual',
                updatedAt: new Date(now).toISOString(),
              },
            ],
            priceObservations: priced
              ? [
                  {
                    id: 'purchase:purchase-0',
                    purchaseLogId: 'purchase-0',
                    productId: 'milk',
                    storeId: 'DE:edeka',
                    price: { minor: 249, currency: 'EUR' },
                    basis: 'package',
                    observedAt: `${date}T12:00:00Z`,
                    source: 'receipt',
                  },
                ]
              : [],
            completedTrips: completed
              ? [
                  {
                    id: 'trip',
                    listId: 'list',
                    listName: 'Migros',
                    store: 'Edeka',
                    currency: 'EUR',
                    completedAt: now,
                    items: [
                      {
                        id: 'row',
                        purchaseLogId: 'purchase-0',
                        name: 'Milch',
                        amount: '1 Stück',
                        price: 2.49,
                      },
                    ],
                  },
                ]
              : [],
          },
        })
      )
    },
    { priced, completed }
  )
  await page.goto('/AlexCart/')
  await expect(page.locator('[data-item-id="item-13"]')).toBeVisible()
}
const stored = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('alexshop-store')!).state)

test('a legacy 13-of-15 shopping session can choose Migros and remembers country, store and progress', async ({
  page,
}) => {
  await legacySession(page)
  await page.getByRole('button', { name: 'Einkaufsort ändern', exact: true }).tap()
  const dialog = page.getByRole('dialog', { name: 'Einkaufsort ändern', exact: true })
  await expect(dialog.getByLabel('Einkaufsland', { exact: true })).toBeEnabled()
  await dialog.getByRole('button', { name: 'Migros · Schweiz', exact: true }).tap()
  await dialog.getByLabel('Filiale (optional)').fill('Bahnhof')
  await dialog.getByRole('button', { name: 'Geschäft übernehmen', exact: true }).tap()
  await expect(page.getByRole('button', { name: 'Einkaufsort ändern', exact: true })).toContainText(
    'Schweiz · Migros Bahnhof'
  )
  const state = await stored(page)
  expect(state.shoppingSession).toMatchObject({
    currency: 'CHF',
    store: 'Migros Bahnhof',
    storeId: 'CH:migros bahnhof',
  })
  expect(state.shoppingSession.checkedItemIds).toHaveLength(13)
  expect(
    state.purchaseLog.every(
      (entry: { storeId: string; currency: string }) =>
        entry.storeId === 'CH:migros bahnhof' && entry.currency === 'CHF'
    )
  ).toBe(true)
  expect(state.settings.weeklyBudget).toBe(100)
  await page
    .locator('[data-item-id="item-13"]')
    .getByRole('button', { name: 'Artikel 13 abhaken', exact: true })
    .tap()
  await page.getByRole('button', { name: 'Ohne Preis abhaken', exact: true }).tap()
  expect((await stored(page)).shoppingSession.store).toBe('Migros Bahnhof')
  await page.reload()
  await page.getByRole('button', { name: 'Einkaufsmodus starten', exact: true }).tap()
  await expect(page.getByRole('button', { name: 'Einkaufsort ändern', exact: true })).toContainText(
    'Schweiz · Migros Bahnhof'
  )
  await expect(page.getByRole('button', { name: 'Einkaufsort ändern', exact: true })).toContainText(
    'Preise in CHF'
  )
})

test('changing a priced trip retains euros by default and exports the corrected actual store', async ({
  page,
}) => {
  await legacySession(page, true)
  await page.getByRole('button', { name: 'Einkaufsort ändern', exact: true }).tap()
  const dialog = page.getByRole('dialog', { name: 'Einkaufsort ändern', exact: true })
  await dialog.getByRole('button', { name: 'Migros · Schweiz', exact: true }).tap()
  await expect(dialog.getByRole('checkbox')).not.toBeChecked()
  await dialog.getByRole('button', { name: 'Geschäft übernehmen', exact: true }).tap()
  expect((await stored(page)).purchaseLog[0]).toMatchObject({
    price: 2.49,
    currency: 'EUR',
    storeId: 'CH:migros',
  })
  await page.getByRole('link', { name: 'Preise', exact: true }).tap()
  await page.getByRole('button', { name: 'Preise exportieren', exact: true }).tap()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'JSON für KI exportieren', exact: true }).tap()
  const file = await download
  const payload = JSON.parse(readFileSync((await file.path())!, 'utf8'))
  expect(payload.records).toHaveLength(1)
  expect(payload.records[0]).toMatchObject({
    country: 'CH',
    store: 'Migros',
    price: { minor: 249, currency: 'EUR' },
  })
})

test('a completed receipt permits explicit currency correction and keeps its linked comparison prices consistent', async ({
  page,
}) => {
  await legacySession(page, true, true)
  await page.goto('/AlexCart/#/stats')
  await page.getByRole('button').filter({ hasText: 'Migros · Edeka' }).tap()
  await page.getByRole('button', { name: 'Einkaufsort des Bons ändern', exact: true }).tap()
  const dialog = page.getByRole('dialog', { name: 'Einkaufsort ändern', exact: true })
  await dialog.getByRole('button', { name: 'Migros · Schweiz', exact: true }).tap()
  await dialog
    .getByRole('checkbox', { name: 'Währungsangabe korrigieren: CHF statt EUR', exact: true })
    .check()
  await dialog.getByRole('button', { name: 'Geschäft übernehmen', exact: true }).tap()
  const receipt = page.getByRole('dialog', { name: 'Migros', exact: true })
  await expect(
    receipt.getByRole('button', { name: 'Einkaufsort des Bons ändern', exact: true })
  ).toContainText('Migros · Schweiz')
  await expect(receipt).toContainText('CHF 2.49')
  const state = await stored(page)
  expect(state.completedTrips[0]).toMatchObject({ storeId: 'CH:migros', country: 'CH', currency: 'CHF' })
  expect(state.purchaseLog[0]).toMatchObject({ price: 2.49, storeId: 'CH:migros', currency: 'CHF' })
  expect(state.priceObservations[0]).toMatchObject({
    storeId: 'CH:migros',
    price: { minor: 249, currency: 'CHF' },
  })
})
