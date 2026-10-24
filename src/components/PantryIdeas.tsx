import { useState } from 'react'
import { useStore } from '@/store/useStore'
import { baseQuantity } from '@/utils/quantity'
import { normalize } from '@/utils/text'

const IDEAS = [
  {
    name: 'Tomaten-Pasta',
    ingredients: [
      { name: 'Pasta', amount: '250 g', category: 'Getreide & Beilagen' },
      { name: 'Tomaten', amount: '400 g', category: 'Früchte & Gemüse' },
    ],
  },
  {
    name: 'Gemüsereis',
    ingredients: [
      { name: 'Reis', amount: '200 g', category: 'Getreide & Beilagen' },
      { name: 'Karotten', amount: '300 g', category: 'Früchte & Gemüse' },
    ],
  },
  {
    name: 'Haferfrühstück',
    ingredients: [
      { name: 'Haferflocken', amount: '100 g', category: 'Getreide & Beilagen' },
      { name: 'Milch', amount: '250 ml', category: 'Milch & Käse' },
    ],
  },
]
export function PantryIdeas() {
  const pantry = useStore((s) => s.pantry)
  const [message, setMessage] = useState('')
  const available = new Set(
    pantry.filter((p) => (baseQuantity(p.amount ?? '')?.value ?? 0) > 0).map((p) => normalize(p.name))
  )
  const ideas = IDEAS.map((idea) => ({
    ...idea,
    matches: idea.ingredients.filter((i) => available.has(normalize(i.name))).length,
  }))
    .filter((i) => i.matches > 0)
    .sort((a, b) => b.matches - a.matches)
  if (!ideas.length) return null
  return (
    <section className="card-surface my-4 p-4">
      <h2 className="mb-2 font-bold">Ideen aus deinem Vorrat</h2>
      <p className="mb-3 text-xs">
        Zutatenideen für zwei Portionen. Beim Übernehmen werden bekannte Bestände abgezogen.
      </p>
      {ideas.map((idea) => (
        <div key={idea.name} className="border-b py-2" style={{ borderColor: 'var(--border)' }}>
          <div className="text-sm font-bold">{idea.name}</div>
          <div className="text-xs">
            {idea.matches} von {idea.ingredients.length} Zutaten im Vorrat
          </div>
          <button
            className="btn-soft my-2 min-h-11 px-3 text-sm"
            onClick={() => {
              const result = useStore.getState().importRecipeItemsToActiveList(idea.ingredients, 'merge')
              setMessage(
                result.ok
                  ? `${idea.name}: fehlende Mengen zur Einkaufsliste übernommen.`
                  : (result.error ?? 'Übernahme fehlgeschlagen.')
              )
            }}
          >
            Fehlende Zutaten übernehmen
          </button>
        </div>
      ))}
      {message && (
        <p className="mt-2 text-sm" role="status">
          {message}
        </p>
      )}
    </section>
  )
}
