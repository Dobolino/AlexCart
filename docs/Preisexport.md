# Preise für KI-Auswertungen exportieren

Unter **Preise → Preise exportieren** standardmäßig **Beide Länder** wählen. Der Export steht auch in den bisherigen Exportbereichen der Statistik und Einstellungen bereit.

- **JSON für KI exportieren** enthält strukturierte Käufe und Preisbeobachtungen.
- **CSV exportieren** eignet sich zum Filtern in einer Tabellenkalkulation.
- **Analyseauftrag + Daten** erzeugt eine Textdatei mit einem passenden KI-Auftrag und den JSON-Daten. Die Datei kann anschließend selbst bei einer KI hochgeladen werden.

Die App sendet den Export nicht automatisch an einen KI-Dienst. Es werden Produkt- und Kaufdaten ausgegeben, einschließlich Geschäft und Datum. Listennamen, persönliche Notizen, Einladungslinks und Zugriffsschlüssel werden ausgelassen. Eine vollständige App-Sicherung ist weiterhin ein separates Format.

## Was die Daten bedeuten

JSON verwendet `schemaVersion: 2`. Jeder Datensatz kennzeichnet `kind` als `purchase` oder `observation`. Mit einem Kauf verknüpfte Beobachtungen erscheinen nicht doppelt.

| Feld | Bedeutung |
| --- | --- |
| `date`, `store`, `country`, `retailer` | Zeitpunkt und bekannte Geschäftszuordnung |
| `countryInferredFromCurrency` | Land nur aus CHF/EUR abgeleitet, falls keine Geschäftszuordnung vorliegt |
| `name`, `category`, `variant`, `brand`, `brandScope` | Produkt, Variante und bekannte Markenart |
| `productId`, `gtins` | Produktidentität und Barcodes, soweit erfasst |
| `price.minor`, `price.currency`, `price.basis` | Originalpreis in Rappen/Cent, CHF/EUR sowie Kaufgesamtpreis, Packung oder Grundpreiseinheit |
| `amount`, `amountMeaning` | Erfasste Menge und deren Bedeutung, sonst `null` |
| `unitPrice` | Bekannter Grundpreis pro kg, l oder Stück als Dezimalstring, sonst `null` |
| `discounted`, `loyaltyRequired`, `source`, `sourceUrl` | Aktion, bekannte Bedingungen und Quelle |
| `exchangeRate` | Separater Kurs-Snapshot mit Quelle und Datum, falls vorhanden |

Beispiel: `price: { "minor": 249, "currency": "EUR", "basis": "purchase total" }` bedeutet insgesamt 2,49 EUR für die unter `amount` angegebene Kaufmenge. Bei einer Preisbeobachtung mit `basis: "kg"` ist derselbe Wert dagegen ein Kilopreis.

CHF und EUR werden nicht umetikettiert oder zu einer unbereinigten Summe addiert. Ein vorhandener Wechselkurs ist ein Referenzkurs mit Datum und kein erfundener historischer Bankkurs. Der Analyseauftrag verlangt vergleichbare Produkte, Packungsgrößen, Grundpreise und sichtbare Datenlücken. Unterschiedliche historische Warenkörbe ergeben kein belastbares Händler-Ranking.

Nicht erfasste Aktions- oder Kundenkartenbedingungen bleiben `null`. Ein unbekanntes Kundenkarten-Erfordernis wird nicht als ausdrücklich kartenfreier Preis ausgegeben.

Neue Käufe speichern ihre Menge direkt im Kaufprotokoll. Für ältere Käufe wird die Menge nur aus einer eindeutig verknüpften Quittungsposition übernommen. Fehlt diese Information, bleibt der Grundpreis unbekannt. Eine heutige Produktgröße wird nicht nachträglich als damalige Kaufmenge ausgegeben.

CSV schützt Textzellen vor unbeabsichtigter Formelausführung. Für eine KI-Auswertung mit Wechselkurs-Metadaten ist JSON beziehungsweise die Textdatei vorzuziehen.

## Import und bestehende Daten

Der Listenimport akzeptiert Wochenplan-JSON, ein JSON-Artikelarray oder zeilenweisen Zutatentext. Eine Vorschau zeigt die übernommenen Artikel und bereits vorhandenen Vorrat. Beim Ersetzen offener Artikel ist eine ausdrückliche Auswahl nötig; erledigte Artikel bleiben erhalten.

Das lokale Speicherformat ist Version 21. Die Migration ergänzt die Länder- und Markenpräferenzen; vorhandene Listen, Marken-IDs, Preisprofile und Kaufhistorien bleiben erhalten. Der Offline-Markenkatalog liegt im App-Bundle. Nur tatsächlich gewählte oder selbst angelegte Marken werden zusätzlich im persönlichen Markenbestand gespeichert.
