import { useId } from 'react'
import { RETAILERS, defaultRetailer, type RetailSelection, type RetailCountry } from '@/data/retailCatalog'
import { useStore } from '@/store/useStore'

export function MarketSelector({
  value,
  onChange,
  lockCountry = false,
}: {
  value: RetailSelection
  onChange: (selection: RetailSelection) => void
  lockCountry?: boolean
}) {
  const id = useId()
  const preferred = useStore((s) => s.settings.preferredRetailers)
  return (
    <div className="market-selector grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-2">
      <label htmlFor={`${id}-country`} className="text-[12px] font-semibold">
        Land
        <select
          id={`${id}-country`}
          aria-label="Einkaufsland"
          className="input mt-1 w-full"
          value={value.country}
          disabled={lockCountry}
          onChange={(event) => {
            const country = event.target.value as RetailCountry
            const remembered = preferred?.[country]
            const retailerId = RETAILERS.some((r) => r.id === remembered && r.country === country)
              ? remembered!
              : defaultRetailer(country)
            onChange({ country, retailerId })
          }}
        >
          <option value="CH">Schweiz</option>
          <option value="DE">Deutschland</option>
        </select>
      </label>
      <label htmlFor={`${id}-retailer`} className="text-[12px] font-semibold">
        Supermarkt
        <select
          id={`${id}-retailer`}
          aria-label="Supermarkt"
          disabled={lockCountry}
          className="input mt-1 w-full"
          value={value.retailerId}
          onChange={(event) => onChange({ ...value, retailerId: event.target.value })}
        >
          {RETAILERS.filter((r) => r.country === value.country).map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
