// Local native-text PDFs -> additive price archive. Personal source files stay outside the repo.
// Usage: node scripts/build-price-archive.mjs --out /private/prices.json --migros /private/migros --edeka /private/edeka
import { readdir, readFile, writeFile, stat } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { createHash } from 'node:crypto'
import Decimal from 'decimal.js'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { createServer } from 'vite'

const args = process.argv.slice(2)
const option = (name) => args[args.indexOf(name) + 1]
if (!args.includes('--out') || (!args.includes('--migros') && !args.includes('--edeka')))
  throw new Error('Usage: --out <JSON file> --migros <PDF folder> --edeka <PDF folder>')
const output = resolve(option('--out'))
const hash = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 32)
async function collect(directory) {
  const files = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) files.push(...(await collect(join(directory, entry.name))))
    else if (entry.isFile() && /\.pdf$/i.test(entry.name)) files.push(join(directory, entry.name))
  }
  return files
}
const server = await createServer({ server: { middlewareMode: true } })
const products = new Map(),
  stores = new Map(),
  prices = new Map()
const report = {
  receipts: 0,
  acceptedReceipts: 0,
  excludedReceipts: 0,
  excludedRows: 0,
  products: 0,
  observations: 0,
}
try {
  const { parseReceiptCheck, checkName } = await server.ssrLoadModule('/src/utils/receiptCheck.ts')
  const { receiptPdfText } = await server.ssrLoadModule('/src/utils/receiptPdfText.ts')
  const { recognizeReceiptLabel, receiptRetailerKey } = await server.ssrLoadModule(
    '/src/data/receiptVocabulary.ts'
  )
  const { findRetailer } = await server.ssrLoadModule('/src/data/retailCatalog.ts')
  const { parseAmount, parsePackAmount, isCountUnit } = await server.ssrLoadModule('/src/utils/amount.ts')
  const { baseQuantity } = await server.ssrLoadModule('/src/utils/quantity.ts')
  const { PRODUCTS } = await server.ssrLoadModule('/src/data/products.ts')
  const { parsePriceArchive, preparePriceArchiveImport } = await server.ssrLoadModule(
    '/src/utils/priceArchive.ts'
  )
  const today = new Date().toISOString().slice(0, 10)
  for (const [flag, fallback, currency, country] of [
    ['--migros', 'Migros', 'CHF', 'CH'],
    ['--edeka', 'EDEKA', 'EUR', 'DE'],
  ]) {
    if (!args.includes(flag)) continue
    for (const file of await collect(resolve(option(flag)))) {
      report.receipts++
      let pdf
      try {
        if ((await stat(file)).size > 25 * 1024 ** 2) throw new Error('File limit')
        pdf = await getDocument({
          data: new Uint8Array(await readFile(file)),
          verbosity: 0,
          isEvalSupported: false,
        }).promise
        if (pdf.numPages > 20) throw new Error('Page limit')
        const pages = []
        for (let index = 1; index <= pdf.numPages; index++) {
          const page = await pdf.getPage(index)
          try {
            pages.push(receiptPdfText((await page.getTextContent()).items))
          } finally {
            page.cleanup()
          }
        }
        const doc = parseReceiptCheck(pages.join('\n'))
        const sum = [...doc.lines, ...doc.adjustments].reduce((total, line) => total + line.minor, 0)
        if (
          doc.warnings.length ||
          doc.totalMinor === undefined ||
          doc.totalMinor <= 0 ||
          sum !== doc.totalMinor ||
          !doc.date ||
          doc.date > today ||
          (doc.currency && doc.currency !== currency)
        )
          throw new Error('Review receipt')
        const retailer = findRetailer(doc.store ?? fallback, country) ?? findRetailer(fallback, country)
        const store = {
          id: `archive-store:${country}:${retailer.id}`,
          retailerId: retailer.id,
          name: retailer.name,
          country,
          currency,
        }
        const observedAt = `${doc.date}T12:00:00.000Z`
        stores.set(store.id, store)
        for (const line of doc.lines) {
          if (line.minor <= 0 || line.cancelled) {
            report.excludedRows++
            continue
          }
          const recognized = recognizeReceiptLabel(
            line.name,
            receiptRetailerKey(store.name, currency),
            [],
            line.amount,
            !!line.weighed
          )
          const pack = parsePackAmount(line.amount),
            amount = parseAmount(line.amount),
            quantity = baseQuantity(line.amount)
          let netQuantity,
            basis = 'package',
            minor
          if (line.weighed && quantity && ['g', 'ml'].includes(quantity.unit) && quantity.value > 0) {
            basis = quantity.unit === 'g' ? 'kg' : 'l'
            netQuantity = { value: 1000, unit: quantity.unit }
            minor = new Decimal(line.minor).mul(1000).div(quantity.value).toDecimalPlaces(0).toNumber()
          } else if (!line.weighed && pack) {
            netQuantity = baseQuantity(`${pack.packValue} ${pack.packUnit}`)
            minor = new Decimal(line.minor).div(pack.count).toDecimalPlaces(0).toNumber()
          } else if (
            !line.weighed &&
            amount &&
            isCountUnit(amount.unit) &&
            Number.isInteger(amount.value) &&
            amount.value > 0
          ) {
            netQuantity = { value: 1, unit: 'piece' }
            minor = new Decimal(line.minor).div(amount.value).toDecimalPlaces(0).toNumber()
          } else if (!line.weighed && quantity && quantity.value > 0) {
            netQuantity = quantity
            minor = line.minor
          }
          if (!netQuantity || !Number.isSafeInteger(minor) || minor <= 0) {
            report.excludedRows++
            continue
          }
          const name = recognized.name.trim()
          const category =
            PRODUCTS.find((product) => checkName(product.name) === checkName(name))?.category ?? 'Sonstiges'
          // Preserve distinct labels with identical proposals; the import planner can merge exact identities.
          const id = `archive-product:${hash([retailer.id, checkName(line.name), recognized.brandName, netQuantity, basis])}`
          const previous = products.get(id)
          products.set(id, {
            id,
            name,
            brand: recognized.brandName,
            category,
            gtins: [],
            netQuantity,
            source: 'manual',
            updatedAt: previous && previous.updatedAt > observedAt ? previous.updatedAt : observedAt,
          })
          const observation = {
            id: `archive-price:${hash([id, store.id, observedAt, minor, basis, !!line.discountMinor])}`,
            productId: id,
            storeId: store.id,
            price: { minor, currency },
            basis,
            observedAt,
            source: 'receipt',
            discounted: (line.discountMinor ?? 0) < 0,
          }
          prices.set(observation.id, observation)
        }
        report.acceptedReceipts++
      } catch {
        report.excludedReceipts++
      } finally {
        await pdf?.destroy()
      }
    }
  }
  const archive = parsePriceArchive(
    JSON.stringify({
      format: 'alexshop-price-archive',
      version: 1,
      catalog: [...products.values()],
      retailStores: [...stores.values()],
      priceObservations: [...prices.values()],
    })
  )
  const prepared = preparePriceArchiveImport(
    { catalog: [], retailStores: [], priceObservations: [] },
    archive
  )
  const cleaned = parsePriceArchive(
    JSON.stringify({
      format: archive.format,
      version: archive.version,
      catalog: prepared.catalog,
      retailStores: prepared.retailStores,
      priceObservations: prepared.priceObservations,
    })
  )
  await writeFile(output, JSON.stringify(cleaned, null, 2) + '\n', { mode: 0o600 })
  report.products = cleaned.catalog.length
  report.observations = cleaned.priceObservations.length
} finally {
  await server.close()
}
console.log(JSON.stringify(report, null, 2))
