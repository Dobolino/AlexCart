import { CATEGORIES } from '@/data/products'
import { mergeStoreOptions } from '@/constants/stores'

/** Prompt für Claude: Bon-Foto/PDF → JSON für AlexShop. */
export function buildClaudeReceiptPrompt(
  store: string,
  customStores: string[] = [],
  currency: 'CHF' | 'EUR' = 'CHF'
): string {
  const categories = CATEGORIES.join(', ')
  const stores = mergeStoreOptions(customStores, currency).join(', ')
  const region = currency === 'EUR' ? 'Deutschland/EU' : 'Schweiz'

  return `Du liest einen Kassenbon (${region}, ${currency}) für die App AlexShop.

FILIALE (Kontext): ${store || 'unbekannt'}
Bekannte Filialen/Ketten: ${stores}

AUFGABE
Erkenne alle gekauften Artikel mit Preis. Antworte NUR mit gültigem JSON – kein Markdown, keine Erklärung.

Schema:
{
  "store": "${store || (currency === 'EUR' ? 'Marktkauf' : 'Migros')}",
  "total": 34.65,
  "items": [
    {
      "name": "Produktname ohne Markenprefix wenn möglich",
      "amount": "Menge z. B. 500 g oder 2 Becher oder 2 × 200 g",
      "category": "Kategorie",
      "price": 2.30,
      "unitPrice": 1.15,
      "quantity": 2,
      "wasSale": false
    }
  ]
}

Regeln:
- "price" = bezahlter Zeilenpreis (Gesamt für diese Position) in ${currency}.
- Bei "2 x 1.80" → quantity 2, unitPrice 1.80, price 3.60, amount "2 Stück" oder passende Einheit.
- Packungsgrösse getrennt halten: "4× Cottage Cheese 200g" → amount "4 × 200 g", price = Zeilenpreis.
- Kategorie EXAKT eine von: ${categories}
- Keine MwSt-/Total-Zeilen als Artikel.
- Aktionspreise: wasSale true wenn klar Aktion/Rabatt.
- Namen auf Deutsch, kurz (Ladenname).
- "store" = erkannte Kette/Filiale (auch Einkaufszentrum möglich).

Nur JSON ausgeben.`
}
