# Werkzeugdeck

Interaktive Werkzeuge zum Auswerten, Simulieren und Verstehen wissenschaftlicher Zusammenhänge.

**[Werkzeugdeck öffnen](https://werkzeugdeck.pages.dev/)**

Dieses Repository enthält Katalog, Navigation und Website-Build. Jede Anwendung wird in einem eigenen Repository entwickelt. Der Build führt festgehaltene Tool-Versionen zur gemeinsamen Website zusammen.

| Fachgebiet | Aufgabe | Werkzeug | Repository |
| --- | --- | --- | --- |
| Elektrochemie | Datenauswertung | EIS-Fitting | [Werkzeugdeck-EIS-Fitting](https://github.com/FalkBornmann/Werkzeugdeck-EIS-Fitting) |
| Elektrochemie | Datenauswertung | Potentialkurven | [Werkzeugdeck-Potentialkurven](https://github.com/FalkBornmann/Werkzeugdeck-Potentialkurven) |
| Stofftransport | Simulation | Keks und Tee | [KeksUndTee](https://github.com/FalkBornmann/KeksUndTee) |
| Beschichtungen | Bildanalyse | NSS-Beschichtungsanalyse | Geplant |

„Theoretische Spielereien“ ist eine zusätzliche Sammlung und der vorausgewählte Einstieg. Fachgebiete, Aufgaben, Sammlungen und Suchbegriffe werden unabhängig gepflegt. Eine Anwendung kann mehreren Fachgebieten zugeordnet sein und behält ihre Adresse unter /tools/<id>/.

## Aufbau

- tools.json enthält Fachgebiete, Tätigkeiten, Sammlungen und Tool-Einträge.
- scripts/site.mjs erzeugt Katalog und Fachgebietsseiten.
- assets/ enthält Gestaltung und Suche/Filter.
- scripts/build.mjs erstellt dist/ einschließlich Anwendungen und Weiterleitungen.
- docs/TOOLS.md beschreibt das Einordnen und Veröffentlichen weiterer Tools.
- docs/MIGRATION.md dokumentiert die Bereinigung der bisherigen Struktur.

## Lokal bauen

Node.js ab Version 20 und Git werden benötigt. Es gibt keine npm-Laufzeitabhängigkeiten.

~~~sh
npm test
npm run build
~~~

Der Build verwendet die in tools.json angegebenen Git-Commits. Liegt die lokale Arbeitskopie unter sourceDirectory, liest er Dateien aus diesem Commit. Andernfalls klont er das öffentliche Repository nach .build-sources/. Uncommittete Änderungen werden nicht veröffentlicht.

dist/ über einen lokalen HTTP-Server ansehen. Für Cloudflare Pages den vollständigen Inhalt von dist/ veröffentlichen. Bei Git-Integration lautet der Build-Befehl npm run build, das Ausgabeverzeichnis dist. Der GitHub-Workflow prüft und baut die Website und stellt ein Veröffentlichungsartefakt bereit.

## Grafikexport prüfen

Alle verfügbaren Tools bieten echte SVG-Vektorgrafiken zusätzlich zu PNG. Die SVG-Zeichenkontext-Referenz liegt unter `templates/svg-context.js`. Die Exportvorgaben für weitere Tools stehen in `AGENTS.md` und `docs/TOOLS.md`.

`node scripts/check-exports.cjs` prüft beide Downloadformate in einem isolierten Browser. Dafür werden Playwright, ein Chromium-Browser und die lokale Python-Umgebung des EIS-Tools benötigt. Optional geben `WERKZEUGDECK_PLAYWRIGHT`, `EIS_BROWSER` und `EIS_PYTHON` deren Pfade an. Die Prüfung nutzt synthetische Potentialkurven und die enthaltenen EIS-Beispiele. Prüfdateien liegen anschließend im ignorierten Ordner `Archiv/Export-Pruefung/`.

## Projekt

Privates Projekt in Entwicklung. Grundlagen, Theorie, Fachquellen, Datenverarbeitung und Grenzen stehen in den einzelnen Anwendungen. Für Beiträge gelten die Vorgaben in AGENTS.md.
