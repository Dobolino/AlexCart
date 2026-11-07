/** Small fictional PDF fixture; never include personal receipts in the repository. */
export function receiptPdfFixture(): Buffer {
  const cell = (x: number, y: number, text: string) =>
    `BT /F1 8 Tf ${x} ${y} Td (${text.replace(/[()\\]/g, '\\$&')}) Tj ET`
  const firstPage = [
    cell(10, 270, 'GENOSSENSCHAFT MIGROS TEST'),
    ...['Artikelbezeichnung', 'Menge', 'Preis', 'Gespart', 'Total', '#'].map((s, i) =>
      cell([10, 150, 200, 250, 300, 350][i]!, 250, s)
    ),
    // PDF storage order differs from visual order, as it does in some real receipt PDFs.
    cell(300, 230, '1.70'),
    cell(200, 230, '1.70'),
    cell(150, 230, '1'),
    cell(350, 230, '1'),
    cell(10, 230, 'Milch'),
    cell(300, 210, '2.00'),
    cell(200, 210, '2.00'),
    cell(150, 210, '1'),
    cell(350, 210, '1'),
    cell(10, 210, 'Brot'),
    cell(10, 190, 'Zwischentotal'),
    cell(300, 190, '3.70'),
    cell(10, 170, 'Cumulus 20-Fach.'),
    cell(300, 170, '100.00'),
    cell(10, 150, 'Total CHF'),
    cell(300, 150, '3.70'),
  ].join('\n')
  const secondPage = [
    cell(10, 270, 'Punktestand entspricht 10.00'),
    cell(10, 250, 'Besten Dank fuer Ihren Einkauf'),
  ].join('\n')
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [4 0 R 6 0 R] /Count 2 >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 300] /Resources << /Font << /F1 3 0 R >> >> /Contents 5 0 R >>',
    `<< /Length ${Buffer.byteLength(firstPage)} >>\nstream\n${firstPage}\nendstream`,
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 300] /Resources << /Font << /F1 3 0 R >> >> /Contents 7 0 R >>',
    `<< /Length ${Buffer.byteLength(secondPage)} >>\nstream\n${secondPage}\nendstream`,
  ]
  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  for (const [i, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(pdf))
    pdf += `${i + 1} 0 obj\n${object}\nendobj\n`
  }
  const xref = Buffer.byteLength(pdf)
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  pdf += offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`)
    .join('')
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  return Buffer.from(pdf)
}
