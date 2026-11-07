// Validate native-text receipt PDFs locally without publishing receipt contents.
import { readdir, readFile, stat } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { createServer } from 'vite'

if (!process.argv[2]) throw new Error('Usage: node scripts/check-receipt-corpus.mjs <PDF directory> [...]')
async function collect(directory) {
  const files = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) files.push(...(await collect(join(directory, entry.name))))
    else if (entry.isFile() && /\.pdf$/i.test(entry.name)) files.push(join(directory, entry.name))
  }
  return files
}
const files = (await Promise.all(process.argv.slice(2).map((path) => collect(resolve(path))))).flat()
const server = await createServer({ server: { middlewareMode: true } })
const report = {
  documents: files.length,
  totalsMatched: 0,
  negativeTotals: 0,
  documentsWithWarnings: 0,
  needsReview: 0,
}
try {
  const { receiptPdfText } = await server.ssrLoadModule('/src/utils/receiptPdfText.ts')
  const { parseReceiptCheck } = await server.ssrLoadModule('/src/utils/receiptCheck.ts')
  for (const file of files) {
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
      const receipt = parseReceiptCheck(pages.join('\n'))
      const total = [...receipt.lines, ...receipt.adjustments].reduce((sum, row) => sum + row.minor, 0)
      if (receipt.totalMinor === total) report.totalsMatched++
      else report.needsReview++
      if ((receipt.totalMinor ?? 0) < 0) report.negativeTotals++
      if (receipt.warnings.length) report.documentsWithWarnings++
    } catch {
      report.needsReview++
    } finally {
      await pdf?.destroy()
    }
  }
} finally {
  await server.close()
}
console.log(JSON.stringify(report, null, 2))
if (!files.length || report.needsReview || report.documentsWithWarnings) process.exitCode = 1
