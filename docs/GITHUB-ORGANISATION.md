# Gemeinsames Repository und Organisationsarchiv

## Aktiver Aufbau seit 28. November 2026

Verbindliches Entwicklungsziel: [FalkBornmann/Werkzeugdeck](https://github.com/FalkBornmann/Werkzeugdeck). Die Konfiguration steht in project-repository.json. Alle Werkzeuge liegen als normale Themenordner in diesem Repository. Neue Tools bekommen keinen eigenen Git-Eigentümer, kein separates Repository, kein Submodul und keine eigene .git-Verwaltung. Die bisherige Organisationsvorgabe ist durch den ausdrücklichen Nutzerauftrag vom 28. November 2026 ersetzt.

AGENTS.md und templates/tool-AGENTS.md enthalten die Regeln; jedes neue Tool übernimmt sie in seine eigene AGENTS.md. Katalog und Build prüfen das gemeinsame Repository und sichere, eindeutige Quellordner. Die Veröffentlichung verwendet keine entfernten Tool-Klone oder getrennten Revisionspins mehr.

## Was mit der Organisation passiert

Die Organisation [Werkzeugdeck](https://github.com/Werkzeugdeck) bleibt im kostenlosen Tarif als historisches Archiv erhalten. Die bisherigen Tool-Repositories werden nach dem geprüften Umzug mit einem Weiterleitungshinweis versehen und archiviert; ihre Originalhistorien und alten Links bleiben erreichbar. Das bisherige Website-Repository wird unter Erhalt seiner Repository-ID und Historie in das persönliche Konto zurückübertragen und Werkzeugdeck genannt. Die Organisationsprofilseite verweist auf den neuen Entwicklungsort.

Die Organisation wird nicht gelöscht. Ein Löschen würde historische Verweise und Weiterleitungen gefährden und benötigt einen ausdrücklichen separaten Auftrag. Für neue Entwicklung wird die Organisation nicht mehr verwendet. GitHub Actions wurde in allen bisherigen Repositories deaktiviert und bleibt auch im persönlichen Ziel-Repository deaktiviert.

## Verbindliche Kostenregel: 0 USD Zusatzkosten

GitHub Free beibehalten. GitHub ist ausschließlich Quellcodeablage. Keine Actions-Workflows, Codespaces, Packages oder Git LFS verwenden. Tests, Browserprüfungen und Builds lokal ausführen; nur den geprüften statischen Build auf das bestehende Cloudflare Pages Free hochladen. Keine neuen kostenpflichtigen Dienste, Abonnements, Testangebote mit anschließender Zahlung, Zahlungsmethoden, Budgeterhöhungen, Speicherzukäufe oder KI-/API-Kontingente aktivieren. Bestehende 0-Dollar-Budgets und Nutzungssperren erhalten. Bei ausgeschöpften Freigrenzen stoppen oder die kostenlose Umsetzung anpassen.

Die GitHub-Budgets gelten nur für die jeweiligen Produkte und sind keine universelle Sperre für Abonnements oder externe Anbieter. Die letzte Abrechnungsprüfung am 22. November 2026 ergab 0,15 USD Bruttonutzung, vollständig rabattiert, 0 USD abrechenbar und eine fehlende Zahlungsmethode. Historische Bruttonutzung wird durch den Umzug nicht entfernt; deaktivierte Actions erzeugen keine neuen Workflow-Läufe.

Kostenlose Dienste haben technische Grenzen und ihre Anbieter können Bedingungen ändern. Deshalb vor neuen Funktionen und Veröffentlichungen deren kostenlose Nutzbarkeit prüfen; keine automatische kostenpflichtige Ausweichlösung.

## Nachvollziehbarkeit

Die ursprünglichen Tool-Historien sind als Merge-Eltern im gemeinsamen Repository erhalten. docs/monorepo-imports.json dokumentiert die zuvor veröffentlichten Tool-Revisionsstände. Zusätzliche geprüfte Git-Bundles liegen lokal im ignorierten Archiv/Monorepo-2026-11-28/. Unabhängige private Projekte bleiben unberührt. Die öffentlichen Werkzeugdeck-Adressen unter https://werkzeugdeck.pages.dev/tools/ bleiben gleich.
