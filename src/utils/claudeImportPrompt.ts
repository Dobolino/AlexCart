import { CATEGORIES } from '@/data/products'
import { UNITS } from '@/constants/units'

/** Kopierbarer Claude-/ChatGPT-Prompt für den Wochenplan-JSON-Import in AlexShop. */
export function buildClaudeImportPrompt(): string {
  const categories = CATEGORIES.join(', ')
  const units = UNITS.join(', ')

  return `Du erstellst eine Einkaufsliste für die App AlexShop (Schweiz/EU, Deutsch).

AUFGABE
Aus einem Wochenplan, Rezept oder freiem Text eine importierbare Einkaufsliste als JSON erzeugen.

AUSGABE (zwingend)
- Antworte NUR mit gültigem JSON – kein Markdown, keine Code-Fences, keine Erklärung davor oder danach.
- Schema:
{
  "week": "YYYY-MM-DD",
  "items": [
    { "name": "Produktname", "amount": "Menge mit Einheit", "category": "Kategorie", "note": "optionale Einkaufsnotiz" }
  ]
}
- "week": Montag der Woche als ISO-Datum (YYYY-MM-DD). Wenn unklar: heutiger/nächster Montag.
- "name": kurzer Produktname auf Deutsch (wie im Laden), ohne Marken wenn nicht nötig, ohne Rezept-Anweisungen.
- "amount": NUR Menge + Einheit als kurzer String (siehe Mengenregeln). Keine Klammern, keine Meta-Texte.
- "category": EXAKT eine der erlaubten Kategorien (Schreibweise identisch).
- "note" (optional): kurze Einkaufsnotiz für den Laden – erscheint in der App unter dem Artikelnamen.
  Beispiele: "Bio", "ohne Haut", "für Curry", "M-Budget", "von der Frischetheke", "reif".
  Das Feld weglassen, wenn es nichts Nützliches zu notieren gibt (kein leerer String).

ERLAUBTE KATEGORIEN (nur diese, exakte Schreibweise):
${categories}

ERLAUBTE EINHEITEN (bevorzugt diese Wörter):
${units}

MENGENREGELN (sehr wichtig – die App nutzt amount für Stückzahl und Preisschätzung)
1. Verkaufseinheiten zählen – nicht das Netto-Gewicht verdoppeln.
   FALSCH: "2 × 500 g Skyr", "2x500g Joghurt", "1000 g Quark (2 Becher)"
   RICHTIG: "2 Becher", "2 Packungen", "2 Stück"
   Wenn die Packungsgrösse relevant ist: "2 × 500 g" nur wenn wirklich zwei separate Packungen à 500 g gemeint sind UND die App-Form "2 × 500 g" (mit Leerzeichen um ×) verwendet wird. Bevorzuge aber "2 Packungen" / "2 Becher" / "2 Dosen", wenn die Stückzahl das Kaufziel ist.

2. Passende Einheit zum Produkt:
   - Joghurt, Skyr, Quark, Sahne → Becher oder Packung (z. B. "2 Becher")
   - Konserven, Tomatenstückchen, Bohnen → Dose (z. B. "2 Dosen")
   - Milch, Getränke → l oder Flasche (z. B. "1 l", "2 Flaschen")
   - Brot, Brötchen → Stück oder Packung
   - Eier → Stück (z. B. "6 Stück")
   - TK-Ware, Fertiggerichte → Packung
   - Gewürze, Öl in Tuben/Gläsern → Tube / Glas / Packung
   - Obst/Gemüse nach Stück → Stück (z. B. "4 Stück" für Äpfel)
   - Obst/Gemüse nach Gewicht → g oder kg (z. B. "500 g", "1 kg") nur wenn wirklich gewogen gekauft wird
   - Fleisch & Fisch: sinnvolle Kaufmenge in g/kg ODER "1 Packung" / "2 Stück" – reine Zahl+Einheit, ohne Zusatztext

3. KEINE Meta-Hinweise in name oder amount – diese gehören in "note" oder weg:
   FALSCH in amount/name: "genau wie angegeben", "wie im Rezept", "ca. nach Geschmack", "Hähnchenbrust (600 g genau)", "Tomaten – reif bitte"
   RICHTIG: amount "600 g" + optional note "für Curry" / "ohne Knochen"; name bleibt "Hähnchenbrust"

4. Keine Rezept-Mengen wie "eine Prise", "nach Geschmack", "etwas". Lieber weglassen oder sinnvolle Kaufmenge wählen.
5. Keine doppelten Artikel: gleiche name+category zusammenfassen und Mengen addieren (z. B. 2× Milch → "2 l"). Notizen bei Merge mit "; " verbinden.
6. Keine Vorratsschrank-Dinge die man typischerweise schon hat (Salz, Pfeffer), es sei denn der Plan verlangt explizit Nachkauf.
7. amount darf leer sein nur wenn die Menge völlig unklar ist – sonst immer setzen.

BEISPIELE (gut)
{"week":"2026-08-10","items":[
  {"name":"Skyr","amount":"2 Becher","category":"Milch & Käse"},
  {"name":"Tomaten","amount":"500 g","category":"Früchte & Gemüse","note":"reif"},
  {"name":"Gurken","amount":"2 Stück","category":"Früchte & Gemüse"},
  {"name":"Hähnchenbrust","amount":"600 g","category":"Fleisch & Fisch","note":"ohne Haut"},
  {"name":"Reis","amount":"1 Packung","category":"Getreide & Beilagen"},
  {"name":"Passata","amount":"2 Dosen","category":"Konserven & Saucen"},
  {"name":"Milch","amount":"2 l","category":"Milch & Käse","note":"laktosefrei"}
]}

BEISPIELE (schlecht – nicht so)
- "2 × 500 g Skyr" wenn gemeint ist: zwei Becher kaufen → stattdessen "2 Becher"
- amount "600 g (genau wie angegeben)" oder "wie im Rezept" → amount "600 g", Zusatz in note
- "Tomaten 2x" ohne Einheit
- Kategorie "Obst" statt "Früchte & Gemüse"
- Englische Namen ("chicken breast") statt Deutsch ("Hähnchenbrust")
- Zubereitungshinweise im Namen ("Hähnchen anbraten") – Name = Produkt, Rest in note oder weglassen

JETZT
Erzeuge die Liste aus dem folgenden Wochenplan/Rezept/Text. Nur JSON ausgeben.`
}
