import { test, expect, type Page } from '@playwright/test'

test.use({ hasTouch: true })
async function openReceipt(page: Page, active = false) {
  await page.addInitScript(
    ({ active }) => {
      if (localStorage.getItem('alexshop-store')) return
      const now = Date.now(),
        date = new Date(now).toISOString().slice(0, 10)
      const items = [
        {
          id: 'milk',
          name: 'Milch',
          amount: '1 Stück',
          category: 'Milch & Käse',
          productId: 'milk',
          done: true,
          purchaseLogId: 'log-milk',
          addedAt: now,
        },
        {
          id: 'bread',
          name: 'Brot',
          amount: '1 Stück',
          category: 'Brot & Backwaren',
          done: true,
          purchaseLogId: 'log-bread',
          addedAt: now,
        },
      ]
      localStorage.setItem(
        'alexshop-store',
        JSON.stringify({
          version: 22,
          state: {
            lists: [{ id: 'list', name: 'Kassenbon-Test', weekLabel: '', createdAt: now, items }],
            activeListId: 'list',
            settings: {
              currency: 'CHF',
              theme: 'dark',
              hasSeenOnboarding: true,
              listViewMode: 'tiles',
              askPriceOnCheckoff: true,
            },
            shoppingSession: active
              ? {
                  listId: 'list',
                  store: 'Migros',
                  storeId: 'CH:migros',
                  currency: 'CHF',
                  startedAt: now - 60000,
                  totalPausedMs: 0,
                  checkedItemIds: ['milk', 'bread'],
                }
              : null,
            completedTrips: active
              ? []
              : [
                  {
                    id: 'trip',
                    listId: 'list',
                    listName: 'Kassenbon-Test',
                    store: 'Migros',
                    storeId: 'CH:migros',
                    country: 'CH',
                    currency: 'CHF',
                    completedAt: now,
                    items: items.map((item, index) => ({
                      id: item.id,
                      name: item.name,
                      amount: item.amount,
                      purchaseLogId: item.purchaseLogId,
                      price: index ? 2 : 1.5,
                    })),
                  },
                ],
            purchaseLog: items.map((item, index) => ({
              id: item.purchaseLogId,
              itemId: item.id,
              productId: item.productId,
              name: item.name,
              category: item.category,
              amount: item.amount,
              price: index ? 2 : 1.5,
              profilePrice: index ? 2 : 1.5,
              storeId: 'CH:migros',
              date,
              currency: 'CHF',
            })),
            retailStores: [
              { id: 'CH:migros', name: 'Migros', retailerId: 'migros', country: 'CH', currency: 'CHF' },
            ],
            priceObservations: [
              {
                id: 'purchase:log-milk',
                purchaseLogId: 'log-milk',
                productId: 'milk',
                storeId: 'CH:migros',
                price: { minor: 150, currency: 'CHF' },
                basis: 'package',
                source: 'receipt',
                observedAt: `${date}T12:00:00Z`,
              },
            ],
            pantry: [{ id: 'stock', name: 'Milch', category: 'Milch & Käse', amount: '2 Stück' }],
          },
        })
      )
    },
    { active }
  )
  await page.goto(active ? '/AlexCart/' : '/AlexCart/#/stats')
  if (!active) {
    await page.getByRole('button').filter({ hasText: 'Kassenbon-Test · Migros' }).tap()
    await page.getByRole('button', { name: 'Mit Kassenbonfoto prüfen', exact: true }).tap()
    await expect(page.getByRole('dialog', { name: 'Bon mit Foto prüfen', exact: true })).toBeVisible()
  }
}
const stored = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('alexshop-store')!).state)

test('compares receipt text, requires explicit price selection and confirmation, and updates linked prices once', async ({
  page,
}) => {
  await openReceipt(page)
  const audit = page.getByRole('dialog', { name: 'Bon mit Foto prüfen', exact: true })
  await audit
    .getByLabel('Bon-Text', { exact: true })
    .fill('MIGROS\nMilch 1.70 A\nBrot 2.00 B\nTOTAL CHF 3.70')
  await audit.getByRole('button', { name: 'Text abgleichen', exact: true }).tap()
  await expect(audit).toContainText('1 von 2 erkannten Positionen preisgleich')
  await expect(audit).toContainText('Erkannte Zeilensumme entspricht dem Endbetrag.')
  await expect(audit).toContainText('Bon-Endbetrag ist CHF 0.20 höher als die App-Summe.')
  expect((await stored(page)).purchaseLog[0].price).toBe(1.5)
  const row = audit.getByRole('region', { name: 'Bonposition Milch', exact: true })
  await row.getByRole('checkbox', { name: 'Preis für Milch übernehmen', exact: true }).check()
  const save = audit.getByRole('button', { name: '1 Preisänderung & Prüfung speichern', exact: true })
  await expect(save).toBeDisabled()
  await audit.getByRole('checkbox', { name: /^Das Foto bzw/ }).check()
  expect((await stored(page)).purchaseLog[0].price).toBe(1.5)
  await page.setViewportSize({ width: 390, height: 540 })
  await save.tap()
  await expect(audit).toHaveCount(0)
  const state = await stored(page)
  expect(state.completedTrips).toHaveLength(1)
  expect(state.completedTrips[0].items[0].price).toBe(1.7)
  expect(state.purchaseLog).toHaveLength(2)
  expect(state.purchaseLog[0]).toMatchObject({ price: 1.7, profilePrice: 1.7, currency: 'CHF' })
  expect(state.priceObservations[0].price).toEqual({ minor: 170, currency: 'CHF' })
  expect(state.pantry[0].amount).toBe('2 Stück')
  expect(state.completedTrips[0].receiptReview.status).toBe('matched')
})

test('keeps currency mismatches and incomplete scans visibly unresolved and never silently changes prices', async ({
  page,
}) => {
  await openReceipt(page)
  const audit = page.getByRole('dialog', { name: 'Bon mit Foto prüfen', exact: true })
  await audit.getByLabel('Bon-Text', { exact: true }).fill('EDEKA\nMilch 1,70\nRabatt 0,20-\nTOTAL EUR 8,00')
  await audit.getByRole('button', { name: 'Text abgleichen', exact: true }).tap()
  await expect(audit).toContainText('Zeilensumme und Endbetrag weichen ab')
  await expect(audit).toContainText('Der Einkauf ist in CHF gespeichert, der Bon in EUR')
  await audit.getByRole('checkbox', { name: /^Das Foto bzw/ }).check()
  await expect(audit.getByRole('button', { name: 'Prüfergebnis speichern', exact: true })).toBeDisabled()
  await audit.getByRole('button', { name: 'Schließen', exact: true }).tap()
  expect((await stored(page)).purchaseLog[0].price).toBe(1.5)
  expect((await stored(page)).completedTrips[0].receiptReview).toBeUndefined()
})

test('supports a manual mapping after an unreadable image without inventing a product match', async ({
  page,
}) => {
  await openReceipt(page)
  const audit = page.getByRole('dialog', { name: 'Bon mit Foto prüfen', exact: true })
  await audit
    .getByLabel('Bonbild auswählen', { exact: true })
    .setInputFiles({ name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('not an image') })
  await expect(audit.getByRole('alert')).toContainText('Bild nicht lesbar')
  await audit.getByLabel('Bon-Text', { exact: true }).fill('Vollmilch 1.70\nBrot 2.00\nTOTAL CHF 3.70')
  await audit.getByRole('button', { name: 'Text abgleichen', exact: true }).tap()
  const row = audit.getByRole('region', { name: 'Bonposition Vollmilch', exact: true })
  await expect(
    row.getByRole('checkbox', { name: 'Preis für Vollmilch übernehmen', exact: true })
  ).toBeDisabled()
  await row.getByRole('button', { name: 'Produkt zuordnen · bearbeiten', exact: true }).tap()
  await row.getByRole('combobox', { name: 'App-Position', exact: true }).selectOption('milk')
  await row.getByRole('checkbox', { name: 'Preis für Vollmilch übernehmen', exact: true }).check()
  await audit.getByRole('checkbox', { name: /^Das Foto bzw/ }).check()
  await audit.getByRole('button', { name: '1 Preisänderung & Prüfung speichern', exact: true }).tap()
  expect((await stored(page)).purchaseLog[0].price).toBe(1.7)
})

test('offers the photo check directly after finishing a shopping trip', async ({ page }) => {
  await openReceipt(page, true)
  await page.getByRole('button', { name: 'Einkauf abschließen', exact: true }).tap()
  const finish = page.getByRole('dialog', { name: 'Einkauf abschließen?', exact: true })
  await finish.getByRole('button', { name: 'Abschließen & neue Liste', exact: true }).tap()
  await page.getByRole('button', { name: 'Bon mit Foto prüfen', exact: true }).tap()
  await expect(page.getByRole('dialog', { name: 'Bon mit Foto prüfen', exact: true })).toBeVisible()
  expect((await stored(page)).shoppingSession).toBeNull()
  expect((await stored(page)).completedTrips).toHaveLength(1)
})

test('requires a fresh comparison after explicitly correcting the receipt currency', async ({ page }) => {
  await openReceipt(page)
  const audit = page.getByRole('dialog', { name: 'Bon mit Foto prüfen', exact: true })
  await audit.getByLabel('Bon-Text', { exact: true }).fill('EDEKA\nMilch 1,70\nBrot 2,00\nTOTAL EUR 3,70')
  await audit.getByRole('button', { name: 'Text abgleichen', exact: true }).tap()
  await audit.getByRole('button', { name: 'Einkaufsort oder Währung ändern', exact: true }).tap()
  const location = page.getByRole('dialog', { name: 'Einkaufsort ändern', exact: true })
  await location.getByRole('button', { name: 'EDEKA · Deutschland', exact: true }).tap()
  await location
    .getByRole('checkbox', { name: 'Währungsangabe korrigieren: EUR statt CHF', exact: true })
    .check()
  await location.getByRole('button', { name: 'Geschäft übernehmen', exact: true }).tap()
  await expect(audit).toContainText('Bon oder Text wurde verändert')
  await expect(audit.getByRole('button', { name: 'Prüfergebnis speichern', exact: true })).toBeDisabled()
  await audit.getByRole('button', { name: 'Abgleich neu erstellen', exact: true }).tap()
  await expect(audit.getByRole('checkbox', { name: /^Das Foto bzw/ })).not.toBeChecked()
  const state = await stored(page)
  expect(state.purchaseLog[0]).toMatchObject({ currency: 'EUR', price: 1.5 })
  expect(state.completedTrips[0].receiptReview).toBeUndefined()
})
