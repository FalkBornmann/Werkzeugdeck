# Werkzeugdeck

Interaktive Werkzeuge zum Auswerten, Simulieren und Verstehen wissenschaftlicher Zusammenhänge.

**[Werkzeugdeck öffnen](https://werkzeugdeck.pages.dev/)**

Dieses Repository enthält Katalog, Navigation und Website-Build. Jede Anwendung wird in einem eigenen Repository entwickelt. Der Build führt festgehaltene Tool-Versionen zur gemeinsamen Website zusammen.

Alle öffentlichen Werkzeugdeck-Anwendungen gehören zur [Organisation Werkzeugdeck](https://github.com/Werkzeugdeck). Dieses Repository enthält die Website. Neue Tool-Repositories werden ausschließlich in dieser Organisation angelegt. [Regeln und Ablauf für Agenten](docs/GITHUB-ORGANISATION.md).

| Fachgebiet | Aufgabe | Werkzeug | Repository |
| --- | --- | --- | --- |
| Elektrochemie | Datenauswertung | EIS-Fitting | [eis-fitting](https://github.com/Werkzeugdeck/eis-fitting) |
| Elektrochemie | Datenauswertung | Potentialkurven | [potentialkurven](https://github.com/Werkzeugdeck/potentialkurven) |
| Stofftransport | Simulation | Keks und Tee | [keks-und-tee](https://github.com/Werkzeugdeck/keks-und-tee) |
| Wärmeübertragung | Simulation | Kaffee & Milch | [kaffee-und-milch](https://github.com/Werkzeugdeck/kaffee-und-milch) |
| Elektrochemie | Simulation | Winand-Diagramm | [winand-diagramm](https://github.com/Werkzeugdeck/winand-diagramm) |
| Werkstofftechnik | Simulation | Gefügerechner für Stähle | [gefuegerechner](https://github.com/Werkzeugdeck/gefuegerechner) |
| Werkstofftechnik | Simulation | Gefügerechner für Aluminium | [aluminiumgefuegerechner](https://github.com/Werkzeugdeck/aluminiumgefuegerechner) |
| Werkstofftechnik | Simulation | Legierungsatlas | [legierungsatlas](https://github.com/Werkzeugdeck/legierungsatlas) |
| Beschichtungen | Simulation | Abluft beim Lackieren | [abluftrechner](https://github.com/Werkzeugdeck/abluftrechner) |

„Theoretische Spielereien“ ist eine zusätzliche Sammlung und der vorausgewählte Einstieg. Fachgebiete, Aufgaben, Sammlungen und Suchbegriffe werden unabhängig gepflegt. Eine Anwendung kann mehreren Fachgebieten zugeordnet sein und behält ihre Adresse unter /tools/<id>/.

## Aufbau

- tools.json enthält Fachgebiete, Tätigkeiten, Sammlungen und Tool-Einträge.
- scripts/site.mjs erzeugt Katalog und Fachgebietsseiten.
- assets/ enthält Gestaltung und Suche/Filter.
- scripts/build.mjs erstellt dist/ einschließlich Anwendungen und Weiterleitungen.
- docs/TOOLS.md beschreibt das Einordnen und Veröffentlichen weiterer Tools.
- docs/MIGRATION.md dokumentiert die Bereinigung der bisherigen Struktur.
- content/theory.mjs enthält die fachlichen Lernwege. Neue verfügbare Tools benötigen dort eine passende Einordnung; der Build prüft dies.
- docs/DESIGN.md definiert Fachfarben, Aufgabenpiktogramme, kompakte Exportmenüs und lokale Simulationsvideos.

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
