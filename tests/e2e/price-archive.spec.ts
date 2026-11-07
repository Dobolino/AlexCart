import { test, expect, type Page } from '@playwright/test'

const archive = {
  format: 'alexshop-price-archive',
  version: 1,
  catalog: ['ch', 'de'].map((id) => ({
    id: `archive:product:${id}`,
    name: id === 'ch' ? 'Testmilch kurz' : 'Testdrink',
    brand: id === 'ch' ? 'Testmarke CH' : 'Testmarke DE',
    category: 'Milch & Käse',
    gtins: [],
    netQuantity: { value: 1000, unit: 'ml' },
    source: 'manual',
    updatedAt: '2025-01-02T12:00:00.000Z',
  })),
  retailStores: [
    { id: 'archive:store:ch', retailerId: 'migros', name: 'Migros', country: 'CH', currency: 'CHF' },
    { id: 'archive:store:de', retailerId: 'edeka', name: 'Edeka', country: 'DE', currency: 'EUR' },
  ],
  priceObservations: ['ch', 'de'].map((id) => ({
    id: `archive:price:${id}`,
    productId: `archive:product:${id}`,
    storeId: `archive:store:${id}`,
    price: { minor: id === 'ch' ? 200 : 150, currency: id === 'ch' ? 'CHF' : 'EUR' },
    basis: 'package',
    observedAt: '2025-01-02T12:00:00.000Z',
    source: 'receipt',
    discounted: false,
  })),
}

async function openArchive(page: Page) {
  await page.addInitScript(() => {
    if (localStorage.getItem('alexshop-store')) return
    localStorage.setItem(
      'alexshop-store',
      JSON.stringify({
        version: 26,
        state: {
          lists: [
            {
              id: 'list',
              name: 'Migros',
              weekLabel: '',
              createdAt: 1,
              items: [
                {
                  id: 'milk',
                  name: 'Milch',
                  amount: '1 l',
                  category: 'Milch & Käse',
                  done: false,
                  addedAt: 1,
                },
              ],
            },
          ],
          activeListId: 'list',
          settings: { currency: 'CHF', theme: 'dark', hasSeenOnboarding: true, listViewMode: 'tiles' },
          completedTrips: [],
          purchaseLog: [],
          pantry: [],
          catalog: [],
          priceObservations: [],
          retailStores: [],
        },
      })
    )
  })
  await page.goto('http://127.0.0.1:8788/AlexCart/#/settings')
  await page.getByRole('button', { name: 'Preise & Marken', exact: true }).click()
  return page.getByRole('region', { name: 'Bonpreise für Kostenschätzung', exact: true })
}
async function stored(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('alexshop-store')!).state)
}

test('previews and edits historic prices before importing without creating purchases or stock', async ({
  page,
}) => {
  const section = await openArchive(page)
  const before = await stored(page)
  await section.getByLabel('Bonpreis-Datei auswählen', { exact: true }).setInputFiles({
    name: 'bonpreise.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(archive)),
  })
  await expect(section.getByRole('heading', { name: 'Vorschau vor dem Import' })).toBeVisible()
  await expect(section.getByText('2 Produkte · 2 Bonpreise', { exact: true })).toBeVisible()
  const row = section.getByRole('article', { name: 'Preisvorschlag Testmilch kurz', exact: true })
  await row.getByText('Zuordnung & Preise prüfen', { exact: true }).click()
  await row.getByLabel('Artikelname für die Liste', { exact: true }).fill('Milch')
  await expect(section.getByRole('button', { name: '2 Bonpreise übernehmen', exact: true })).toBeDisabled()
  expect((await stored(page)).priceObservations).toEqual(before.priceObservations)
  await section
    .getByLabel('Ich habe die ausgewählten Produkte und Preisangaben geprüft.', { exact: true })
    .check()
  await section.getByRole('button', { name: '2 Bonpreise übernehmen', exact: true }).click()
  await expect(section.getByRole('status')).toContainText('2 Bonpreise übernommen')
  const after = await stored(page)
  expect(after.priceObservations).toHaveLength(2)
  expect(after.catalog.find((product: { name: string }) => product.name === 'Milch')).toBeTruthy()
  expect(
    after.priceObservations.map((row: { price: { currency: string } }) => row.price.currency).sort()
  ).toEqual(['CHF', 'EUR'])
  for (const key of ['lists', 'purchaseLog', 'completedTrips', 'pantry'])
    expect(after[key]).toEqual(before[key])

  await page.getByRole('link', { name: 'Liste', exact: true }).click()
  const estimate = page.getByText('Ungefähres Total', { exact: true }).locator('../..')
  await expect(estimate).toContainText('CHF 2.00')
  await expect(estimate).toContainText('1 aus Bonpreisen')
  await page.getByRole('button', { name: 'Artikel hinzufügen', exact: true }).click()
  await page.getByRole('searchbox', { name: 'Artikelsuche', exact: true }).fill('Testmarke CH')
  await page
    .getByRole('button')
    .filter({ hasText: 'Bonpreis / Produktkatalog' })
    .filter({ hasText: 'Testmarke CH' })
    .click()
  expect(
    (await stored(page)).lists[0].items.some(
      (item: { productId?: string }) => item.productId === 'archive:product:ch'
    )
  ).toBe(true)
  await expect(estimate).toContainText('CHF 4.00')

  await page.goto('http://127.0.0.1:8788/AlexCart/#/settings')
  await page.getByRole('button', { name: 'Preise & Marken', exact: true }).click()
  const sameArchive = {
    ...archive,
    catalog: archive.catalog.map((product) =>
      product.id === 'archive:product:ch' ? { ...product, name: 'Milch' } : product
    ),
  }
  await section.getByLabel('Bonpreis-Datei auswählen', { exact: true }).setInputFiles({
    name: 'bonpreise-geprueft.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(sameArchive)),
  })
  await section
    .getByLabel('Ich habe die ausgewählten Produkte und Preisangaben geprüft.', { exact: true })
    .check()
  await section.getByRole('button', { name: '2 Bonpreise übernehmen', exact: true }).click()
  await expect(section.getByRole('status')).toContainText('2 bereits vorhanden')
  expect((await stored(page)).priceObservations).toHaveLength(2)
})

test('shows invalid-file errors and imports only selected countries', async ({ page }) => {
  const section = await openArchive(page)
  const input = section.getByLabel('Bonpreis-Datei auswählen', { exact: true })
  await input.setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{') })
  await expect(section.getByRole('alert')).toBeVisible()
  await input.setInputFiles({
    name: 'bonpreise.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(archive)),
  })
  await expect(section.getByRole('alert')).toHaveCount(0)
  await section.getByRole('combobox', { name: 'Land in der Vorschau', exact: true }).selectOption('CH')
  await expect(section.getByRole('article')).toHaveCount(1)
  await section.getByRole('button', { name: 'Alle Treffer abwählen', exact: true }).click()
  await expect(section.getByText('1 Produkt · 1 Preis ausgewählt', { exact: true })).toBeVisible()
  await section
    .getByLabel('Ich habe die ausgewählten Produkte und Preisangaben geprüft.', { exact: true })
    .check()
  await section.getByRole('button', { name: '1 Bonpreis übernehmen', exact: true }).click()
  await expect(section.getByRole('status')).toContainText('1 Bonpreis übernommen')
  const after = await stored(page)
  expect(after.priceObservations).toHaveLength(1)
  expect(after.priceObservations[0].price.currency).toBe('EUR')
  expect(after.catalog).toHaveLength(1)
})
