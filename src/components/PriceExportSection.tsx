import { useState } from 'react'
import { Icon } from '@/components/Icon'
import { ICON_PATHS } from '@/constants/icons'
import { shareOrDownloadFile } from '@/utils/backup'
import {
  buildPriceAnalysisPrompt,
  buildPriceExport,
  exportPriceCsv,
  exportPriceJson,
  priceExportFilename,
} from '@/utils/priceExport'
import type { CompletedTrip, Currency, GlobalBrand, ProductPriceProfile, PurchaseLogEntry } from '@/types'

interface PriceExportSectionProps {
  purchaseLog: PurchaseLogEntry[]
  priceProfiles: ProductPriceProfile[]
  brands: GlobalBrand[]
  completedTrips: CompletedTrip[]
  currency: Currency
  /** Kompakte Darstellung in den Einstellungen. */
  compact?: boolean
}

export function PriceExportSection({
  purchaseLog,
  priceProfiles,
  brands,
  completedTrips,
  currency,
  compact = false,
}: PriceExportSectionProps) {
  const [message, setMessage] = useState('')
  const pricedCount = purchaseLog.filter((e) => e.price && e.price > 0).length

  if (!pricedCount) {
    if (compact) return null
    return (
      <div className="mb-4.5">
        <div
          className="mb-2 px-1.5 text-[13px] font-extrabold uppercase tracking-wide"
          style={{ color: 'var(--category-fg)' }}
        >
          Preise exportieren
        </div>
        <div className="card-surface px-3.5 py-3.5">
          <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
            Noch keine Preise erfasst. Beim Abhaken Preise eintragen – dann kannst du CSV/JSON exportieren
            und z. B. mit einer KI Diagramme erstellen.
          </p>
        </div>
      </div>
    )
  }

  function buildPayload() {
    return buildPriceExport({
      purchaseLog,
      priceProfiles,
      brands,
      completedTrips,
      currency,
    })
  }

  async function handleExportCsv() {
    const payload = buildPayload()
    await shareOrDownloadFile(
      exportPriceCsv(payload),
      priceExportFilename('csv'),
      'text/csv;charset=utf-8',
      'AlexShop Preise'
    )
    setMessage('CSV exportiert.')
  }

  async function handleExportJson() {
    const payload = buildPayload()
    await shareOrDownloadFile(
      exportPriceJson(payload),
      priceExportFilename('json'),
      'application/json',
      'AlexShop Preise'
    )
    setMessage('JSON exportiert.')
  }

  async function handleCopyAiPrompt() {
    const prompt = buildPriceAnalysisPrompt(buildPayload())
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(prompt)
      } else {
        const ta = document.createElement('textarea')
        ta.value = prompt
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      setMessage('Prompt kopiert.')
    } catch {
      setMessage('Kopieren fehlgeschlagen.')
    }
  }

  return (
    <div className={compact ? 'mb-3' : 'mb-4.5'}>
      {!compact && (
        <div
          className="mb-2 px-1.5 text-[13px] font-extrabold uppercase tracking-wide"
          style={{ color: 'var(--category-fg)' }}
        >
          Preise exportieren
        </div>
      )}
      <div className="card-surface flex flex-col">
        {!compact && (
          <p className="border-b px-3.5 py-3 text-[12px] leading-snug" style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
            {pricedCount} Preise · vollständiger Export mit stabilem KEY (Datum|Produkt|Filiale|Währung) zum Nachverfolgen von Änderungen. Enthält auch Quittungen.
          </p>
        )}
        <button
          type="button"
          className="tap-scale flex items-center gap-3 border-b px-3.5 py-3.5 text-left text-[14px] font-semibold"
          style={{ borderColor: 'var(--border)' }}
          onClick={() => void handleExportCsv()}
        >
          <Icon path={ICON_PATHS.share} size={18} />
          Als CSV exportieren
        </button>
        <button
          type="button"
          className="tap-scale flex items-center gap-3 px-3.5 py-3.5 text-left text-[14px] font-semibold"
          onClick={() => void handleExportJson()}
        >
          <Icon path={ICON_PATHS.share} size={18} />
          Als JSON exportieren
        </button>
      </div>
      <details className="mt-2 rounded-xl border px-3.5 py-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <summary className="cursor-pointer text-[13px] font-bold" style={{ color: 'var(--text-muted)' }}>
          Optional: Diagramme per KI
        </summary>
        <button
          type="button"
          className="btn-soft tap-scale mt-2 flex w-full items-center justify-center gap-2 py-2.5 text-[13px] font-bold"
          onClick={() => void handleCopyAiPrompt()}
        >
          <Icon path={ICON_PATHS.copy} size={18} />
          Prompt mit Daten kopieren
        </button>
      </details>
      {message && (
        <p className="mt-2 px-1.5 text-[12px]" style={{ color: 'var(--text-muted)' }}>
          {message}
        </p>
      )}
    </div>
  )
}
