# GitHub Organisation für Werkzeugdeck

Neue Werkzeugdeck-Anwendungen werden in einer gemeinsamen GitHub-Organisation entwickelt. Das persönliche Konto verwaltet die Organisation, ist aber nicht mehr der Ziel-Eigentümer neuer Tool-Repositories. Verbindliche Konfiguration: `github-organization.json`.

## Einrichtungsstand am 21. November 2026

Zielname: `Werkzeugdeck`. Tarif: GitHub Free. Status: Einrichtung vorbereitet, Organisation noch nicht erstellt. Das GitHub-Formular verlangt die ausdrückliche Zustimmung zu den Nutzungsbedingungen. Vor der Erstellung keine Repository-Transfers und keine Umstellung funktionierender Quelladressen durchführen. Den tatsächlich angelegten Organisationsnamen vor Verwendung bestätigen und bei Abweichung in der Konfiguration korrigieren.

Das Website-Repository soll `website` heißen. Tool-Repositories erhalten kurze, dauerhafte Namen wie `eis-fitting`, `potentialkurven`, `keks-und-tee`, `kaffee-und-milch`, `winand-diagramm`, `gefuegerechner`, `legierungsatlas` und `abluftrechner`. Tool-IDs und öffentliche `/tools/<id>/`-Adressen bleiben erhalten.

## Neue Tools durch Agenten

1. Konfiguration und Organisationszugriff prüfen. Bei `pending-creation` oder fehlendem Zugriff lokal weiterarbeiten und die Einschränkung melden. Kein persönliches Ersatz-Repository erstellen.
2. Vor einem neuen Repository prüfen, ob die Anwendung bereits in der Organisation existiert. Ein geplantes Tool ohne Quellcode benötigt noch kein Repository.
3. Eigenes öffentliches Repository unter dem konfigurierten Organisationsnamen anlegen. Die bisherige Erlaubnis für öffentliche Werkzeugdeck-Tools gilt weiter; private Arbeitsdaten und unabhängige persönliche Projekte gehören nicht hinein.
4. Eigene `AGENTS.md` aus `templates/tool-AGENTS.md` übernehmen und den bestätigten Organisationsnamen eintragen. Fachtheorie, Gestaltung, Exporte und Hinweise nach den Werkzeugdeck-Projektregeln ergänzen.
5. Tool in `tools.json` mit `Organisation/Repository` und einer geprüften vollständigen Commit-ID aufnehmen. Der Katalog prüft den Eigentümer verfügbarer Tools. Nur die expliziten Alteinträge sind vorübergehend ausgenommen.
6. Organisationsübersicht und Fachgebietszuordnung ergänzen; Tests, Build und Browserprüfung durchführen. Downloads werden weiterhin ausschließlich gezielt freigegeben.

## Bestehende Repositories übertragen

- Lokale Git-Bundles aller acht Tools und des Website-Repositories wurden unter `Archiv/GitHub-Organisation-2026-11-21/` erstellt und mit `git bundle verify` geprüft. Das Manifest dokumentiert Quelladressen und Commitstände; eine Kopie des Katalogs und ein Patch lokaler Änderungen liegen daneben. Neue Commits seit der Sicherung vor dem Transfer berücksichtigen.
- Zuerst ein kleines Tool übertragen, Git-Commit und Zugriff prüfen und die entsprechende Ausnahme aus `legacyRepositories` entfernen. Erst danach weitere Tools umziehen. Git-Remotes, README-/Quellcodeverweise und Katalog aktualisieren.
- Das Website-Repository zuletzt übertragen. Alle festgeschriebenen Tool-Revisionsstände müssen nach dem Umzug abrufbar sein. GitHub-Anbindungen, Actions und Veröffentlichungszugriff auf die neue Organisation prüfen.
- Bestehendes Cloudflare-Pages-Projekt und Website-Adressen erhalten. Erst den vollständigen geprüften Build veröffentlichen. Keine alte GitHub-Adresse wieder mit einem neuen Repository belegen, solange deren Weiterleitung gebraucht wird.
- Archivierte Weiterleitungs-Repositories `EIS-Fitting-Web` und `Eintunken` bleiben vorerst beim persönlichen Konto, damit ihre GitHub-Pages-Adressen erhalten bleiben. Unabhängige private Projekte werden nicht übertragen.
- Nach vollständigem Umzug `status` auf `active` setzen und `legacyRepositories` leeren. Organisationsprofil unter `.github/profile/README.md` mit Fachgebieten und Tool-/Website-Links einrichten.
