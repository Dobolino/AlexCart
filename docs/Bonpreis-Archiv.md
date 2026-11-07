# Historische Bonpreise für die Kostenschätzung

Unter **Optionen → Preise & Marken → Bonpreise für Kostenschätzung** kann eine vorbereitete JSON-Datei geladen werden. Zuerst erscheint eine lokale Vorschau mit Land, Geschäft, Datum, Marke, Packungsgröße und Preisen. Produkte lassen sich suchen, auswählen und vor dem Import umbenennen. Für eine Zuordnung zu einem vorhandenen Listenartikel müssen Name und Kategorie übereinstimmen. Unterschiedliche Marken und Packungen bleiben getrennt; eine ähnliche Bezeichnung genügt nicht.

Nach der Prüfbestätigung ergänzt der Import ausschließlich Produktkatalog, Geschäfte und Preisbeobachtungen. Einkaufslisten, abgeschlossene Bons, Kaufprotokoll, Vorrat und Ausgabenstatistik werden nicht verändert. Das Archiv ist **keine Datensicherung** und gehört nicht in die Funktion „Sicherung einspielen“. Identische Importe ergänzen keine Doppelpreise. Konflikte mit bereits anders belegten IDs werden gemeldet, statt vorhandene Angaben zu überschreiben.

Importierte Produkte erscheinen auch in der Artikelsuche mit Marke und Größe. Wer einen solchen Treffer auswählt, verknüpft den Listenartikel ausdrücklich mit diesem Produkt. Bei einem generischen Namen werden Preise nur verwendet, wenn Marke und Packung eindeutig sind.

Die Schätzung berücksichtigt das gewählte Geschäft und die Originalwährung. Passende eigene Normalpreise haben Vorrang; anschließend werden passende historische Bonpreise verwendet. Packungspreise skalieren mit der Packungsanzahl, lose Ware mit der tatsächlichen Masse bzw. dem Volumen. Mengen ohne sichere Grundlage bleiben ungeschätzt. Die Liste und der Einkaufsmodus zeigen die Zahl der Artikel mit Preis, die verwendeten Bonrichtpreise und Preise, die älter als 90 Tage sind. Eine Teilsumme für bekannte Artikel ist keine Zusage für den ganzen Warenkorb.

Aktionspreise, Kundenkartenbedingungen, Mindestmengen, abgelaufene und zukünftige Beobachtungen werden nicht als normale Richtpreise eingesetzt. Gutscheine, Punkte, Pfand und Retouren sind keine Produktnormalpreise; Coupons werden nicht pauschal auf Artikel verteilt. Historische Preise sind Richtwerte und keine aktuelle Händlerabfrage.

## Eigene PDFs lokal aufbereiten

Für Text-PDFs kann die Datei lokal erzeugt werden:

```sh
node scripts/build-price-archive.mjs --out /privat/bonpreise.json --migros /privat/migros --edeka /privat/edeka
```

Das Skript prüft zunächst die Belegsumme, den Händler, die Währung und das Datum. Nur positive Warenzeilen mit bestimmbarem Mengenbezug werden übernommen. Mehrfachpackungen werden auf eine Packung, lose Ware auf kg/l umgerechnet; Preise werden auf Rappen/Cent gerundet. Unklare Zeilen und negative Rückerstattungsbons werden ausgelassen. Die Ausgabe enthält ausschließlich Produkte, Originalpreise, Geschäftsbezeichnungen und Beobachtungsdaten; keine Adressen, Kundennummern oder Zahlungsdaten. PDFs und erzeugte Preisdateien gehören außerhalb des öffentlichen Repositorys.

Das Format `alexshop-price-archive`, Version 1, enthält die bestehenden Modelle `catalog`, `retailStores` und `priceObservations`. Es erzeugt keine künstlichen Käufe oder parallelen Preisprofile. Die bestehende App-Sicherung enthält die importierten Daten anschließend mit.
