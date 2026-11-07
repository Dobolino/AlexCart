# Bonpositionen, Marken und Zuordnungen

Im Bon-Abgleich können fehlende Zeilen über **Bonposition manuell erfassen** ergänzt werden – auch ohne Fototext. Artikelname, Menge, Preis, Kategorie und Marke sind vor dem Speichern editierbar. **Vorhandenen Artikel zuordnen** verknüpft eine Zeile mit einem bereits gekauften Artikel, statt ihn erneut anzulegen. Namensvorschläge sind anklickbare Kandidaten; eine ähnliche Marke oder ein ähnliches Wort löst keine automatische Preisübernahme aus.

Eindeutige Bonkürzel werden getrennt vom Produktnamen erkannt, etwa `MClass` → **M Classic**, `MBud` → **M-Budget**, `G&G` → **Gut & Günstig** und `HERZ.` → **EDEKA Herzstücke**. Eigenmarkenkürzel gelten nur für den passenden Händler. `Bio`, `IP-SUISSE`, `MSC`, `Extra`, ein einzelnes `M` oder der Einkaufsort `Migros` beweisen keine Produktmarke. Insbesondere wird `BJ Extra Erdbeeren` nicht als Ben & Jerry’s behandelt. Unsichere Kürzel bleiben offen.

Die Markenwahl ist im Abgleich vorgemerkt. Eigene Marken werden ebenfalls erst mit der abschließenden Bestätigung gespeichert. Bei einer schon bekannten anderen Marke muss die Zuordnung oder Markenkorrektur ausdrücklich bestätigt werden, bevor Preis oder Menge geändert werden. Korrigiert werden der einzelne Bonposten, sein eindeutig verknüpfter Kauf, das passende Markenprofil und seine Preisbeobachtung. Eine Variante, die frühere Käufe gemeinsam verwenden, wird nicht pauschal umetikettiert.

**Bestätigte Zuordnung für diesen Supermarkt merken** speichert eine lokale Zuordnung des Bontexts zu Artikel, Kategorie und bestätigter Marke. Die Zuordnung berücksichtigt Händler, Währung und Packungsgröße; bei gewogener loser Ware wird die Mengenart verwendet. Sie ergänzt keine Käufe. Abwählen und Speichern entfernt die gemerkte Zuordnung dieser Bonzeile. Höchstens 1.000 Zuordnungen bleiben in der App und der Sicherung erhalten. Das Speicherformat ist Version 26; ältere Sicherungen behalten ihre bisherigen Daten.

Unter **App-Positionen im Bon nicht zugeordnet** können tatsächlich nicht gekaufte App-Positionen zur Entfernung ausgewählt werden. Die Änderung entfernt den Bonposten und seine eindeutig verknüpften Kauf-/Preiseinträge gemeinsam. Mehrdeutige Kaufverknüpfungen sperren den Vorgang. Der aktuelle Vorrat wird bei einer historischen Korrektur nicht rückwirkend verändert. Auch der normale Papierkorb am Bon korrigiert nun die verknüpfte Kaufhistorie.

Die Prüfbestätigung bleibt über dem Speichern-Button sichtbar. Alle ausgewählten Mengen, Artikel, Marken, Entfernungen und das Datum werden erst beim Speichern übernommen. Abbrechen verwirft die Auswahl. Nach einer Korrektur zeigen die Preisfelder des Bons den neuen gespeicherten Wert.

## Preise und Zahlbetrag

Die Auswertung unterscheidet Warenpreise, Gutscheine/Pfand/Rundung und den gedruckten Endbetrag. Punkte und Bonusmultiplikatoren sind keine Geldbeträge. Cumulus-Gutscheine werden nicht auf Einzelpreise verteilt. EDEKA-Summen vor und nach Coupons werden nur als aufeinanderfolgende Endbeträge akzeptiert, wenn die dazwischen gedruckten Abzüge die Differenz erklären. Mehrdeutige Summen bleiben ungeklärt. Steuerübersichten und Zahlungsarten sind keine weiteren Einkäufe.

Migros-Tabellen lesen den bezahlten Zeilenpreis unabhängig von Packungsangaben wie `12x` im Namen. Sternchen und Warengruppenkennzeichen werden berücksichtigt. Explizite Stornos werden mit zuvor erfassten passenden Zeilen verrechnet; eigenständige Retouren bleiben gesondert. Ein negativer Rückerstattungsbon wird erkannt, kann aber keinen normalen Einkauf überschreiben. Die normale Erfassung negativer Einkaufsabschlüsse gehört nicht zum aktuellen Datenmodell.

## Datenbasis und Grenzen

Die bereitgestellten Archive wurden ausschließlich lokal ausgewertet: 127 Migros- und 48 EDEKA-/Marktkauf-PDFs. Bei allen 175 stimmen Waren einschließlich der gedruckten Zu-/Abschläge mit dem Endbetrag überein. Ein Beleg enthält eine negative Rückerstattung. Der zusätzliche November-Beleg wurde ebenfalls gegengeprüft. Dies bestätigt die Rechen- und Formatauswertung dieser Dateien; die Zuordnung zu einem App-Einkauf und konkreten Produkten bleibt prüfpflichtig.

Persönliche PDFs, vollständige Bontexte, Einkaufszusammenstellungen, Preise, Kundennummern und Zahlungsdaten werden nicht im Repository hinterlegt. Regressionstests verwenden erfundene Bons. Wiederholbar für eigene Text-PDFs:

```sh
node scripts/check-receipt-corpus.mjs /pfad/zu/migros /pfad/zu/edeka
```

Das Skript gibt nur aggregierte Prüfzahlen aus. Bild-PDFs ohne Text benötigen die Texterkennung in der App.

Die öffentliche [Open-Food-Facts-Markentaxonomie](https://github.com/openfoodfacts/openfoodfacts-server/blob/main/taxonomies/brands.txt) wurde für Schreibweisen und ausdrücklich gelistete Synonyme herangezogen, etwa **Monster / Monster Energy**. Sie ist keine Zuordnung von Mutterkonzernen zu Untermarken und kein Nachweis einer Händlerverfügbarkeit. Händlerseiten waren in der verwendeten Cloud-Umgebung nicht direkt erreichbar. Die Anwendung nutzt daher einen begrenzten Kürzelkatalog und bestätigte lokale Zuordnungen; sie erfindet keine Marken für unklare Produktzeilen.
