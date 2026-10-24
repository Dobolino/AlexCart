import { useMemo, useState } from 'react'
import { useStore } from '@/store/useStore'
import { shareOrDownloadFile } from '@/utils/backup'
import { buildAiPriceExport, aiPriceCsv, aiPricePrompt, type ExportScope } from '@/utils/aiPriceExport'
import type { CompletedTrip, Currency, GlobalBrand, ProductPriceProfile, PurchaseLogEntry } from '@/types'

interface Props {
  purchaseLog: PurchaseLogEntry[]
  priceProfiles: ProductPriceProfile[]
  brands: GlobalBrand[]
  completedTrips: CompletedTrip[]
  currency: Currency
  compact?: boolean
}
export function PriceExportSection({
  purchaseLog,
  priceProfiles,
  brands,
  completedTrips,
  currency,
  compact = false,
}: Props) {
  const catalog = useStore((s) => s.catalog),
    retailStores = useStore((s) => s.retailStores)
  const observations = useStore((s) => s.priceObservations),
    fx = useStore((s) => s.fxSnapshot)
  const [scope, setScope] = useState<ExportScope>('ALL')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const payload = useMemo(
    () =>
      buildAiPriceExport(
        {
          purchaseLog,
          priceProfiles,
          brands,
          completedTrips,
          catalog,
          retailStores,
          priceObservations: observations,
          fxSnapshot: fx,
          settings: { currency },
        },
        scope
      ),
    [
      purchaseLog,
      priceProfiles,
      brands,
      completedTrips,
      catalog,
      retailStores,
      observations,
      fx,
      currency,
      scope,
    ]
  )
  async function exportData(format: 'json' | 'csv' | 'prompt' | 'copy') {
    setBusy(true)
    setMessage('')
    try {
      if (format === 'copy') {
        await navigator.clipboard.writeText(aiPricePrompt(payload))
        setMessage('Analyseauftrag mit Preisdaten kopiert.')
      } else {
        const text =
          format === 'json'
            ? JSON.stringify(payload, null, 2)
            : format === 'csv'
              ? aiPriceCsv(payload)
              : aiPricePrompt(payload)
        const extension = format === 'prompt' ? 'txt' : format
        await shareOrDownloadFile(
          text,
          `alexshop-preise-${scope.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.${extension}`,
          format === 'json'
            ? 'application/json'
            : format === 'csv'
              ? 'text/csv;charset=utf-8'
              : 'text/plain;charset=utf-8',
          'AlexShop Preisvergleich'
        )
        setMessage('Datei zum Teilen oder Speichern bereit.')
      }
    } catch (e) {
      setMessage(
        e instanceof Error && e.name === 'AbortError'
          ? 'Export abgebrochen.'
          : 'Export nicht möglich. Bitte erneut versuchen.'
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className={compact ? 'mb-3' : 'mb-4'}>
      <h2 className="mb-2 text-lg font-bold">Preise exportieren & mit KI analysieren</h2>
      <p className="mb-3 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
        Käufe und eigene Preisbeobachtungen mit Marke, Geschäft, Datum, Originalwährung und bekannten Mengen.
        Persönliche Notizen, Listennamen und Einladungen werden nicht exportiert.
      </p>
      <label className="block text-sm font-semibold">
        Länder im Export
        <select
          className="input my-2 w-full"
          value={scope}
          onChange={(e) => setScope(e.target.value as ExportScope)}
        >
          <option value="ALL">Schweiz & Deutschland</option>
          <option value="CH">Nur Schweiz</option>
          <option value="DE">Nur Deutschland</option>
        </select>
      </label>
      <p className="mb-3 text-sm">{payload.recordCount} Preisdatensätze · CHF / EUR getrennt</p>
      <div className="grid grid-cols-2 gap-2">
        <button
          className="btn-primary min-h-12 px-3 text-sm"
          disabled={busy || !payload.recordCount}
          onClick={() => void exportData('json')}
        >
          JSON für KI exportieren
        </button>
        <button
          className="btn-soft min-h-12 px-3 text-sm"
          disabled={busy || !payload.recordCount}
          onClick={() => void exportData('csv')}
        >
          CSV für Tabellen
        </button>
        <button
          className="btn-soft col-span-2 min-h-12 px-3 text-sm"
          disabled={busy || !payload.recordCount}
          onClick={() => void exportData('prompt')}
        >
          Analyseauftrag mit Daten als Datei
        </button>
        <button
          className="btn-soft col-span-2 min-h-11 px-3 text-sm"
          disabled={busy || !payload.recordCount}
          onClick={() => void exportData('copy')}
        >
          Analyseauftrag mit Daten kopieren
        </button>
      </div>
      {!payload.recordCount && (
        <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
          Erfasse zuerst einen Kaufpreis oder eine Preisbeobachtung.
        </p>
      )}
      {message && (
        <p role="status" className="mt-3 text-sm">
          {message}
        </p>
      )}
    </section>
  )
}
