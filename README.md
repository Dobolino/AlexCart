# AlexShop

Einkaufslisten-PWA im Bring!-Stil – Import von Wochen-Essensplänen (JSON), Vorrats-Verwaltung,
Preis-Rechner und Statistiken. React + TypeScript + Vite, als PWA installierbar (iOS/Android).

## Entwicklung

```bash
npm ci
npm run dev       # Entwicklung: /AlexCart/dev.html
npm run build     # Frontend + Backend-Typprüfung, Produktions-Build nach dist/
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

Persönliche Daten bleiben lokal im Browser. Freigegebene Einkaufslisten werden mit dem
selbst betriebenen Backend abgeglichen; Preisgedächtnis, Vorrat und andere Listen bleiben privat.

## Neue Funktionen

- Schnelles Hinzufügen, große Trefferflächen, zugängliche Dialoge, Rückgängig und Offline-Start.
- Produktkacheln bleiben beim Abbrechen der Preiseingabe sichtbar; erst bestätigtes Abhaken entfernt sie.
- Navigation und Hinzufügen/Scannen reservieren eigenen Platz. Vorrat mit Suche und Eingabe per Dialog.
- Filialbezogene Kategorienreihenfolge, Einkäufe pausieren/fortsetzen, „nicht gefunden“.
- Getrennte CHF/EUR-Budgets, konsistente Bonkorrekturen und Vorratsbewegungen.
- Länderauswahl mit passenden Supermärkten, getrennten Eigenmarken und allgemeinen Marken.
- Einkaufsort pro Liste merken und nach dem Abhaken oder im Bon korrigieren, einschließlich verknüpfter Vergleichspreise. [Bedienung](docs/Einkaufsort.md)
- Offline-Markenkatalog mit 856 Bezeichnungen, Favoriten, Ausblenden und Bereichsfiltern.
- Import aus Text oder Datei mit Vorschau; kompakte Suche und integriertes Preis-Tastenfeld.
- Preisexport für KI-Auswertungen als JSON, CSV oder mit Analyseauftrag als Textdatei.
- Barcode-Scanner mit nativer Erkennung und ZXing-Fallback sowie manueller Eingabe.
- Persönlicher Produktkatalog, Packungs-/Grundpreise und nachvollziehbare Wechselkurse.
- Optionale Produktdaten von Open Food Facts und Preisbeobachtungen von Open Prices.
- Gemeinsame Listen mit Einladungslink, dauerhafter Offline-Warteschlange und Widerruf.
- Optionale Haltbarkeitsdaten und einfache Rezeptideen aus bekannten Beständen.

## Selbst betriebenes Backend

Voraussetzung ist **Node 24 LTS** (auch in CI). SQLite ist in Node enthalten.

```bash
npm ci
npm run build
npm run server
```

Der Server bindet standardmäßig nur an `127.0.0.1:8787`, liefert `dist/` unter
`/AlexCart/` aus und speichert gemeinsame Listen in `.local-data/alexcart.sqlite`.
Für die Entwicklung zusätzlich `npm run dev` starten; Vite leitet `/api` an den Backendserver weiter.

Für den Betrieb auf einem eigenen Host HTTPS über einen Reverse-Proxy bereitstellen.
`BIND_ADDRESS=0.0.0.0` macht den Server im eigenen Container/Netz erreichbar.
`PORT`, `ALEXCART_DATA_DIR` und `ALLOWED_ORIGINS` (kommagetrennte, genaue Webadressen)
können angepasst werden. Keine pauschale CORS-Freigabe verwenden.
In der App lässt sich unter Optionen die Serveradresse mit `/api` konfigurieren,
wenn Frontend und Backend unterschiedliche Adressen haben.

Für externe Daten müssen ausgehende HTTPS-Verbindungen zu
`world.openfoodfacts.org`, `prices.openfoodfacts.org` und `api.frankfurter.dev`
möglich sein. `APP_CONTACT` identifiziert die eigene Installation bei Open Food Facts.
Der Server berücksichtigt vorhandene Proxy-Umgebungsvariablen; TLS-Prüfung bleibt aktiv.

Ein optionales Dockerfile ist enthalten:

```bash
docker build -t alexcart .
docker run --rm -p 8787:8787 -v alexcart-data:/data \
  -e ALLOWED_ORIGINS=https://einkauf.example alexcart
```

Bei einem HTTPS-Proxy lassen sich vorhandene Proxy-Einstellungen mit
`--build-arg HTTPS_PROXY --build-arg HTTP_PROXY --build-arg NO_PROXY` an den Build
weiterreichen. Ein zusätzlich benötigtes CA-Zertifikat kann über
`--secret id=extra_ca,src=/pfad/zur/ca.pem` eingebunden werden; es wird nicht ins Image kopiert.

Den Datenträger `/data` dauerhaft sichern. `npm run backup:server` erstellt über
SQLite eine konsistente Sicherung im Unterordner `backups`; alternativ
`ALEXCART_BACKUP_DIR` angeben. Eine Rücksicherung erfolgt bei gestopptem Server.

## Gemeinsame Listen und Datenschutz

„Liste teilen“ → „Diese Liste freigeben“ erzeugt einen zufälligen Einladungslink.
Jede Person mit diesem Link kann die betreffende Liste lesen, bearbeiten und Einladungen
widerrufen. Es gibt keine getrennten Administratorrollen. Der Server speichert nur den
Hash des Zugriffsschlüssels; die Geräte behalten ihn lokal in IndexedDB.
Einladungslinks vertraulich weitergeben. Der Zugriffsschlüssel steht im URL-Fragment
und wird beim normalen Laden der Seite nicht als HTTP-Pfad übertragen.

Änderungen werden einzeln vorgemerkt und nach Serverbestätigung entfernt.
Wiederholte Übertragung derselben Vorgangs-ID zählt nicht erneut. Mengenschritte mit
derselben Einheit addieren sich; Änderungen an unterschiedlichen Feldern bleiben erhalten.
Bei derselben Text-/Status-Eigenschaft gilt die Reihenfolge am Server. Gelöschte Artikel
bleiben gegen verspätete Wiederanlage geschützt; ausdrückliches Rückgängig darf sie wiederherstellen.
Eine gleichzeitige Änderung der Mengeneinheit wird als Konflikt angezeigt. Dann die lokale
Liste prüfen oder als lokale Kopie behalten; ausstehende Änderungen werden nicht still verworfen.

Freigaben gelten nur für Listen. Persönliche Preise und Vorrat werden nicht synchronisiert.
App-Sicherungen enthalten die Listen, aber keine Einladungsschlüssel. Nach einer Wiederherstellung
auf einem anderen Gerät den Einladungslink erneut verwenden.

## Preise und offene Daten

Bedienung und vollständige kuratierte Markenliste: [Markenkatalog](docs/Markenkatalog.md).
Exportformate, Mengen und Wechselkurse: [Preisexport für KI-Auswertungen](docs/Preisexport.md).

Originalpreise bleiben in CHF beziehungsweise EUR gespeichert. Umrechnungen verwenden
Decimal-Arithmetik und einen sichtbaren Kurs mit Quelle und Datum. Ohne Kurs erscheint kein
erfundener umgerechneter Preis. Ein eigener Kurs ist auch offline möglich.
Historische Durchschnittsbons heißen Ausgabenübersicht und sind kein Händler-Preisranking.
Warenkörbe zeigen ihre Preisabdeckung; unvollständige Körbe werden nicht als vollständiger
Gesamtpreis dargestellt. Für Packungsware werden ganze Packungen gerechnet.

Open Food Facts / Open Prices sind Community-Daten ohne garantierte Händlerabdeckung.
Die Datenbanklizenzen sind ODbL; Quellen und Bedingungen bei einer Weiterveröffentlichung
beachten. Der Server puffert Anfragen und begrenzt OFF-Produktabfragen auf 15 pro Minute.
Es erfolgt keine automatische öffentliche Übertragung persönlicher Bons oder Produktkorrekturen.
Scanner-Bilder werden lokal decodiert. Kamera und Erkennungsqualität auf echten iOS-/Android-Geräten
vor einem breiten Rollout testen. OCR kann beim ersten Einsatz externe Sprach-/WASM-Dateien benötigen.

## Validierung

```bash
npm run typecheck
npm run lint
npm test -- --maxWorkers=4
npm run build
npx playwright install chromium
npm run test:e2e
```

In Umgebungen mit installiertem Chromium kann
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium` verwendet werden.
Die Browsertests verwenden einen eigenen temporären SQLite-Datenträger und zwei isolierte
Browserkontexte für den Abgleich mit Offline-Neustart. Sie prüfen auch den Produktions-PWA-Startpfad.

Beschädigte Sicherungen werden vor dem Ersetzen geprüft. Die vorherige gültige Sicherung bleibt
für die Wiederherstellung verfügbar; Fehler beim Speichern werden in der App angezeigt.
