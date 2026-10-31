# Gespeicherten Einkauf mit einem Bonfoto abgleichen

Nach **Einkauf abschließen & neue Liste** bietet die Erfolgsmeldung **Bon mit Foto prüfen** an. Bereits gespeicherte Einkäufe öffnest du unter **Stats → Einkaufsverlauf → Bon → Mit Kassenbonfoto prüfen**.

1. **Bon fotografieren** startet die hintere Kamera, soweit das Gerät dies unterstützt. **Bild auswählen** öffnet die Fotoauswahl. Den ganzen Bon möglichst gerade, scharf und ohne Spiegelungen aufnehmen.
2. Die App erkennt den Text lokal und vergleicht Produktzeilen, Zeilentotale und Endbetrag mit dem ausgewählten Einkauf. CHF und EUR werden getrennt behandelt. Wiederholte identische Bonzeilen werden zusammengefasst.
3. Standardmäßig erscheinen Preisabweichungen und nicht zugeordnete Produkte. Über **bearbeiten** kannst du eine App-Position wählen oder einen falsch erkannten Bonpreis korrigieren. Unter **Erkannten Text prüfen** lässt sich der ganze OCR-Text bearbeiten und neu abgleichen. Bon-Text kann auch ohne Foto eingefügt werden.
4. Gewünschte **Preise übernehmen** einzeln auswählen und anschließend bestätigen, dass Bon, Beträge, Mengen und Zuordnungen geprüft wurden. Erst **Preisänderungen & Prüfung speichern** verändert Daten. Ohne ausgewählte Preisänderungen wird nur das Prüfergebnis gespeichert.

Preisänderungen aktualisieren den Bon, eindeutig verknüpfte Kaufprotokolle, Preisprofile und Vergleichspreise gemeinsam. Es werden keine neuen Einkäufe oder Vorratsbewegungen erzeugt. Fehlt bei einem alten Bon die Kaufverknüpfung, wird dies angezeigt; dann kann nur der Bonpreis korrigiert werden. Eine geänderte Menge wird nicht automatisch übernommen. Abweichende bekannte Mengen verhindern die automatische Preisübernahme, damit kein falscher Grundpreis entsteht.

Null- und Gratispreise werden als Abweichung angezeigt, aber nicht automatisch als neuer Artikelpreis übernommen. Rabatte oder Retouren sind gesonderte Bonzeilen und keine negativen Produktpreise.

## Was das Ergebnis aussagt

- **Keine erkannten Preisabweichungen** bedeutet: Der geprüfte Text, seine Endsumme und die zugeordneten App-Positionen stimmen überein. OCR kann Zeichen falsch erkennen; das Foto muss gegengelesen werden. Dies ist keine unabhängige Bestätigung eines Regalpreises.
- **Offene Punkte** bleiben bei nicht erkannten oder nicht zugeordneten Positionen, Mengenabweichungen, fehlendem Endbetrag, widersprüchlichen Metadaten und nicht sicher gelesenen Geldzeilen.
- Rabatte, Pfand, Retouren und Rundung werden gesondert angezeigt. Sie werden nicht erfunden oder automatisch auf Artikel verteilt. Der Gesamtbetrag kann deshalb von der App-Summe abweichen, obwohl einzelne Warenpositionen preisgleich sind.
- Ein Währungsunterschied verhindert die Preisübernahme. Über **Einkaufsort oder Währung ändern** lässt sich eine falsch gespeicherte Währungsangabe ausdrücklich korrigieren. Anschließend muss der Abgleich neu erstellt werden. Es findet keine automatische Umrechnung statt.
- Wird ein Bon während der Prüfung geändert, werden alte Korrekturvorschläge abgewiesen. Eine spätere Änderung am Bon kennzeichnet ein gespeichertes Prüfergebnis als veraltet.

## Foto, Daten und Texterkennung

Das Foto wird auf dem Gerät verarbeitet und nicht an einen KI-Dienst oder das Backend hochgeladen. Für Tesseract, WebAssembly und deutsche Sprachdaten werden beim ersten Gebrauch Dateien von jsDelivr geladen. Die Verarbeitung benötigt dann weder ein KI-Konto noch einen API-Schlüssel. Ohne geladene Erkennungsdateien kann die Fotoerkennung offline scheitern; der Textabgleich bleibt verfügbar.

Fotos werden nicht dauerhaft archiviert. Gespeichert werden Datum und Umfang des Abgleichs, berichtete Währung und Endsumme sowie der Ergebnisstatus. Für einen späteren Fotoabgleich das Bild erneut auswählen. Bilder sind auf 25 MB begrenzt; die OCR-Arbeitsgröße wird verkleinert. Die Erkennung ist abbrechbar, beendet ihren Worker beim Schließen und hat ein Zeitlimit von zwei Minuten.

Das lokale Speicherformat ist Version 23. Die Erweiterung ergänzt lediglich das Prüfergebnis am Bon; vorhandene Einkäufe und Preise werden nicht automatisch verändert.

Validierung: Parser- und Zuordnungstests für CH/DE, atomare Preiskorrekturen, Mengen- und Währungsschutz, Abbruch der OCR sowie Browsertests für Vergleich, manuelle Zuordnung, Fehlerfälle und den Einstieg nach Einkaufsabschluss. Zusätzlich wurde die reale Tesseract-Erkennung im Browser mit einem erzeugten Testbon geprüft; Erkennungsdateien kamen dabei unverändert aus den installierten Paketen beziehungsweise dem offiziellen Sprachpaket. Kameraaufnahme und Qualität realer zerknitterter Bons bleiben geräteabhängig.
