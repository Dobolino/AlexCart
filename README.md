# AlexShop

Einkaufslisten-PWA im Bring!-Stil – Import von Wochen-Essensplänen (JSON), Vorrats-Verwaltung,
Preis-Rechner und Statistiken. React + TypeScript + Vite, als PWA installierbar (iOS/Android).

## Entwicklung

```bash
npm install
npm run dev       # lokaler Dev-Server
npm run build     # Produktions-Build nach dist/
npm run preview   # Build lokal testen
npm run test      # Vitest
npm run lint      # ESLint
```

## Deployment

Push auf `main` baut die App via GitHub Actions und deployed sie automatisch auf GitHub Pages.

Agent-/Claude-Kontext: siehe `.cursor/rules/alexshop.mdc`.

## Datenformat für den Wochenplan-Import

```json
{
  "week": "2026-07-06",
  "items": [
    { "name": "Tomaten", "amount": "500g", "category": "Obst & Gemüse" },
    { "name": "Hähnchenbrust", "amount": "600g", "category": "Fleisch & Fisch" }
  ]
}
```

Alle Daten (Listen, Vorrat, Statistik) werden ausschließlich lokal im `localStorage` des
Geräts gespeichert.
