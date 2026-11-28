# Werkzeugdeck

Interaktive Werkzeuge zum Auswerten, Simulieren und Verstehen wissenschaftlicher Zusammenhänge.

**[Werkzeugdeck öffnen](https://werkzeugdeck.pages.dev/)**

Alle Anwendungen, die Website und die gemeinsamen Grundlagen liegen in diesem öffentlichen Repository. Neue Werkzeuge bekommen einen passenden Themenordner. Es werden keine weiteren Tool-Repositories angelegt. Die bisherige GitHub-Organisation dient nur als Archiv.

| Fachgebiet | Werkzeug | Quellcode |
| --- | --- | --- |
| Elektrochemie | [EIS-Fitting](https://werkzeugdeck.pages.dev/tools/eis-fitting/) | [Ordner](Elektrochemie/Datenauswertung/EIS-Fitting/) |
| Elektrochemie | [Potentialkurven](https://werkzeugdeck.pages.dev/tools/potentialkurven/) | [Ordner](Elektrochemie/Datenauswertung/Potentialkurven/) |
| Stofftransport | [Keks und Tee](https://werkzeugdeck.pages.dev/tools/keks-und-tee/) | [Ordner](Theoretische%20Spielereien/KeksUndTee/) |
| Wärmeübertragung | [Kaffee & Milch](https://werkzeugdeck.pages.dev/tools/kaffee-und-milch/) | [Ordner](Theoretische%20Spielereien/KaffeeUndMilch/) |
| Elektrochemie | [Winand-Diagramm](https://werkzeugdeck.pages.dev/tools/winand-diagramm/) | [Ordner](Elektrochemie/Simulation/Winand-Diagramm/) |
| Werkstofftechnik | [Gefügerechner für Stähle](https://werkzeugdeck.pages.dev/tools/gefuegerechner/) | [Ordner](Werkstofftechnik/Simulation/Gefuegerechner/) |
| Werkstofftechnik | [Legierungsatlas](https://werkzeugdeck.pages.dev/tools/legierungsatlas/) | [Ordner](Werkstofftechnik/Simulation/Legierungsatlas/) |
| Beschichtungen | [Abluft beim Lackieren](https://werkzeugdeck.pages.dev/tools/abluftrechner/) | [Ordner](Beschichtungen/Abluftrechner/) |
| Werkstofftechnik | [Gefügerechner für Aluminium](https://werkzeugdeck.pages.dev/tools/aluminiumgefuegerechner/) | [Ordner](Werkstofftechnik/Simulation/Aluminiumgefuegerechner/) |

## Aufbau und Mitarbeit

Die Themenordner enthalten eigenständige Anwendungen mit README, Tests und AGENTS.md. Der gemeinsame Katalog steht in tools.json, die Fachtheorie in content/theory.mjs. Gestaltung und wiederverwendbare Oberflächen stehen unter assets/ und templates/, Build und Prüfungen unter scripts/. Downloadangebote werden ausschließlich in content/downloads.json freigegeben.

- [Neue Tools und Veröffentlichung](docs/TOOLS.md)
- [Kostenregel, Repository und Organisationsarchiv](docs/GITHUB-ORGANISATION.md)
- [Gestaltung und Exporte](docs/DESIGN.md)
- [Historien und Umzug](docs/MIGRATION.md)

## Lokal prüfen und bauen

Node.js ab Version 20 genügt für den Website-Build. Ein normaler Checkout enthält alle benötigten Tool-Dateien; keine Submodule oder zusätzlichen Klone sind nötig.

~~~sh
npm test
npm run build
~~~

Die einzelnen Tools besitzen eigene Modelltests. Die Browserprüfung läuft lokal mit einem eigenständigen Chromium über node scripts/check-design.cjs. Microsoft Edge ist ausgeschlossen. Der Build liest die Dateien aus dem aktuellen Arbeitsverzeichnis; vor einer Veröffentlichung alle vorgesehenen Änderungen prüfen und gemeinsam committen. dist/ ist der vollständige statische Veröffentlichungsordner.

## Kostenloser Betrieb

GitHub dient ausschließlich als Quellcodeablage. GitHub Actions ist deaktiviert; Workflows, Codespaces, Packages und Git LFS werden nicht eingesetzt. Tests und Builds laufen lokal. Der geprüfte statische Build wird direkt auf das bestehende Cloudflare-Pages-Free-Projekt hochgeladen. Keine kostenpflichtigen Tarife, KI-/API-Dienste, Zahlungsmethoden oder automatischen Upgrades aktivieren. Bei Grenzen stoppen oder die kostenlose Umsetzung anpassen.

Privates Projekt in Entwicklung. Grundlagen, Fachquellen, Modellgrenzen und Verarbeitungshinweise stehen in den Anwendungen. Für Beiträge gilt AGENTS.md.
