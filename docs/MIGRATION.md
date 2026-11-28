# Umstrukturierung am 7. November 2026

## Aktuelle Repositories

`Werkzeugdeck` enthält Katalog und gemeinsamen Build. `Werkzeugdeck-EIS-Fitting`, `Werkzeugdeck-Potentialkurven` und `KeksUndTee` enthalten jeweils eine Anwendung. Neue Vorhaben werden zuerst im Katalog erfasst. Ein Repository folgt mit dem ersten Quellcode.

## Alte Veröffentlichungen

`EIS-Fitting-Web` und `Eintunken` hatten bei der Prüfung aktive GitHub-Pages-Adressen. Diese Repositories werden als Weiterleitungen auf die aktuellen Cloudflare-Adressen erhalten und archiviert. Alte Lesezeichen bleiben dadurch benutzbar. Weitere Entwicklung erfolgt in den aktuellen Repositories.

Das private Repository `EIS-Fitting` gehört nicht zur öffentlichen Werkzeugdeck-Veröffentlichung und wird als eigenständiger Bestand beibehalten.

## Lokale Dateien

Tool-Arbeitskopien bleiben in ihren fachlich zugeordneten Ordnern. Alte ZIP-Veröffentlichungen werden unter `Archiv/Veröffentlichungen-2026-11-07/` gesammelt. Alte Arbeitskopien liegen unter `Archiv/`. Ausgeblendete Testabhängigkeiten und Arbeitskopien unter `.codex-repos/` sind lokale Hilfsdateien und vom Katalog-Repository ausgeschlossen.

Die Website verwendet feste `/tools/`-Adressen und leitet die bisherigen Tool-Adressen weiter. Die Ordnerstruktur legt dadurch keine künftigen Fachgebiete fest.


## Umzug in die Organisation am 21. November 2026

Die aktive Organisation ist https://github.com/Werkzeugdeck. Website und Katalog liegen in `Werkzeugdeck/website`; alle acht verfügbaren Tools besitzen kurze Reponamen entsprechend ihrer Tool-ID. Repository-IDs und Commit-Historien wurden beim Transfer erhalten. Die Quelladressen, lokalen Git-Remotes, README-Verweise und Katalog-Pins wurden aktualisiert. `EIS-Fitting-Web` und `Eintunken` bleiben als archivierte GitHub-Pages-Weiterleitungen beim persönlichen Konto. Unabhängige private Projekte bleiben unverändert.

Jedes Tool enthält nun eine eigene `AGENTS.md`. Neue Anwendungen gehören ausschließlich zur Organisation; Katalog und Build prüfen dies über `github-organization.json`. Ablauf: `docs/GITHUB-ORGANISATION.md`. Die Website bleibt unter https://werkzeugdeck.pages.dev/ erreichbar.


## Umzug ins gemeinsame Repository am 28. November 2026

Die oben dokumentierten Einzelrepository- und Organisationsregeln sind historische Beschreibungen. Aktuell gilt ausschließlich das gemeinsame Repository FalkBornmann/Werkzeugdeck. Neun Tool-Historien wurden ohne Umschreiben als Merge-Eltern übernommen; ihre Themenordner sind normale Bestandteile des gemeinsamen Checkouts. GitHub Actions ist deaktiviert. Die bisherigen Organisations-Repositories dienen nach erfolgreicher Prüfung als Archiv. Aktuelle Regeln: docs/GITHUB-ORGANISATION.md, docs/TOOLS.md und project-repository.json. Die Website-Adressen bleiben unverändert.
