# Abluft beim Lackieren · Werkzeugdeck

Stationärer Lehr- und Vergleichsrechner mit eigenem drehbaren SVG-Kabinenmodell für Wasserwand (unterer Ansaugspalt), Trockenfilterwand und BLS-Laborkabine.

## Start

Einen statischen HTTP-Server im Repository starten und index.html öffnen. Alle Berechnungen laufen lokal und ohne externe Laufzeitbibliotheken. Die Seite wird unter https://werkzeugdeck.pages.dev/tools/abluftrechner/ veröffentlicht.

## Modell

Arbeitsquerschnitt und Ansaugfläche sind getrennt. Q = 3600 A v; Stoffströme aus spritzfertiger Lackmenge, Dichte und Massenanteilen. Optionale additive AGW-/UEG-Vergleiche setzen vollständige Stoffdaten, kontinuierliche Freisetzung, unbelastete Zuluft und ideale Mischung voraus. Keine CFD, Aerosol-Explosionsbewertung oder Anlagenfreigabe. Kein zeitlicher Verdunstungs- oder Trocknungsverlauf. Die Zeichnung ist eine frei einstellbare Lehrgeometrie.

BLS-Referenzwerte für horizontale Applikation: Baugröße 10 mindestens 1500 / empfohlen 2000, 30 mindestens 3000 / empfohlen 3500, 50 mindestens 3500 / empfohlen 4500 m³/h. Quelle: öffentliches Füll-Datenblatt, Seiten 5–6, am 19.11.2026 auf der Herstellerseite verlinkt. Außenmaße werden ausschließlich zur Orientierung angezeigt, nicht als Innenmaße verwendet.

## Quellen und Grenzen

DGUV Information 209-046 (Dezember 2024), TRGS 402/900, Herstellerunterlagen Füll und Schuko. Exakte Links und Einordnung in der Oberfläche. Die BLS-Lehrapp von Hendrik Dubbe diente als Anregung; kein fremder Quellcode, Bildmaterial oder proprietäres Dokument übernommen.

## Prüfung

`npm test` prüft unabhängige Bilanzfälle, Geometrie, Einheiten, Mengenskalierung, Gemischrechnung und ungültige Eingaben. `node tests/browser.cjs` prüft alle Vorlagen, mobile Bedienung sowie PNG-, SVG- und CSV-Downloads. Umgebungsvariablen `WERKZEUGDECK_PLAYWRIGHT` und `EIS_BROWSER` können Playwright und einen eigenständigen Chromium-Testbrowser festlegen. Microsoft Edge nicht verwenden.

PNG und echte SVG-Vektorgrafiken verwenden denselben Darstellungszustand. CSV enthält Rechenwerte und Eingaben. Kein automatisches Offlinepaket.

Privates Projekt in Entwicklung. Mit KI-Unterstützung entwickelt. Gesetzliche Haftungsregelungen gelten; Nutzung und fachliche Entscheidungen erfordern eine unabhängige Prüfung.
