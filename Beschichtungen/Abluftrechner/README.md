# Abluft beim Lackieren · Werkzeugdeck

Stationärer Lehr- und Vergleichsrechner mit eigenem drehbaren SVG-Kabinenmodell für Wasserwand (unterer Ansaugspalt), Trockenfilterwand und BLS-Laborkabine.

## Start

Einen statischen HTTP-Server im Repository starten und index.html öffnen. Alle Berechnungen laufen lokal und ohne externe Laufzeitbibliotheken. Die Seite wird unter https://werkzeugdeck.pages.dev/tools/abluftrechner/ veröffentlicht.

## Modell

Arbeitsquerschnitt und Ansaugfläche sind getrennt. Q = 3600 A v; Stoffströme aus spritzfertiger Lackmenge, Dichte und Massenanteilen. Optionale additive AGW-/UEG-Vergleiche setzen vollständige Stoffdaten, kontinuierliche Freisetzung, unbelastete Zuluft und ideale Mischung voraus. Keine CFD, Aerosol-Explosionsbewertung oder Anlagenfreigabe. Kein zeitlicher Verdunstungs- oder Trocknungsverlauf. Die Zeichnung ist eine frei einstellbare Lehrgeometrie.

Alle Kabinenmaße und Startvolumenströme sind frei einstellbare Lehrannahmen. Es werden keine Herstellermaße, -baugrößen oder -volumenströme vorgegeben oder verglichen.

## Quellen und Grenzen

DGUV Information 209-046 (Dezember 2024), TRGS 402/900, GisChem, BG RCI und BG ETEM. Exakte Links und Einordnung in der Oberfläche. Die BLS-Lehrapp von Hendrik Dubbe diente als Anregung; kein fremder Quellcode, Bildmaterial oder proprietäres Dokument übernommen.

## Prüfung

`npm test` prüft unabhängige Bilanzfälle, Geometrie, Einheiten, Mengenskalierung, Gemischrechnung und ungültige Eingaben. `node tests/browser.cjs` prüft alle Vorlagen, mobile Bedienung sowie PNG-, SVG- und CSV-Downloads. Umgebungsvariablen `WERKZEUGDECK_PLAYWRIGHT` und `EIS_BROWSER` können Playwright und einen eigenständigen Chromium-Testbrowser festlegen. Microsoft Edge nicht verwenden.

PNG und echte SVG-Vektorgrafiken verwenden denselben Darstellungszustand. CSV enthält Rechenwerte und Eingaben. Kein automatisches Offlinepaket.

Privates Projekt in Entwicklung. Mit KI-Unterstützung entwickelt. Gesetzliche Haftungsregelungen gelten; Nutzung und fachliche Entscheidungen erfordern eine unabhängige Prüfung.

## Grenzwertvergleiche

Sechs auswählbare Lösemittel mit AGW nach TRGS 900 (05.06.2026), UEG aus BG-Quellen, CAS, Kurzzeitfaktor/-kategorie und Einzelquellen. Daten geprüft am 19.11.2026. Keine vorgefertigte Lackrezeptur. Bearbeitete Werte werden als Benutzerwerte markiert.

AGW-Gemischindex, UEG-Anteil mit veränderbarem Zuschlagsfaktor (Startwert 3 nach DGUV-Rechenbeispiel) und DGUV-Luftführungsorientierung werden getrennt angezeigt. Zusätzliche 80-%-Warnschwelle ist eine frei gewählte Modelleinstellung. Aerosole und Kurzzeitexposition bleiben ausdrücklich unbewertet. Der Grenzwertvergleich ist als echte SVG- und PNG-Grafik exportierbar; CSV dokumentiert Faktoren und Stoffquellen.
