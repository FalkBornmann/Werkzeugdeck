# GitHub Organisation für Werkzeugdeck

Neue Werkzeugdeck-Anwendungen werden in einer gemeinsamen GitHub-Organisation entwickelt. Das persönliche Konto verwaltet die Organisation, ist aber nicht mehr der Ziel-Eigentümer neuer Tool-Repositories. Verbindliche Konfiguration: `github-organization.json`.

## Einrichtungsstand am 21. November 2026

Organisation: [`Werkzeugdeck`](https://github.com/Werkzeugdeck). Tarif: GitHub Free. Status: aktiv. Die acht öffentlichen Tool-Repositories und das Website-Repository wurden am 21. November 2026 übertragen; ihre Repository-IDs und Historien blieben erhalten. Der GitHub-Connector kann die neue Organisation mit Administratorrechten erreichen.

Das Website-Repository heißt `website`. Tool-Repositories verwenden kurze, dauerhafte Namen wie `eis-fitting`, `potentialkurven`, `keks-und-tee`, `kaffee-und-milch`, `winand-diagramm`, `gefuegerechner`, `legierungsatlas` und `abluftrechner`. Tool-IDs und öffentliche `/tools/<id>/`-Adressen bleiben erhalten.

## Neue Tools durch Agenten

1. Konfiguration und Organisationszugriff prüfen. Bei fehlendem Zugriff lokal weiterarbeiten und die Einschränkung melden. Kein persönliches Ersatz-Repository erstellen.
2. Vor einem neuen Repository prüfen, ob die Anwendung bereits in der Organisation existiert. Ein geplantes Tool ohne Quellcode benötigt noch kein Repository.
3. Eigenes öffentliches Repository unter dem konfigurierten Organisationsnamen anlegen. Die bisherige Erlaubnis für öffentliche Werkzeugdeck-Tools gilt weiter; private Arbeitsdaten und unabhängige persönliche Projekte gehören nicht hinein.
4. Eigene `AGENTS.md` aus `templates/tool-AGENTS.md` übernehmen und den bestätigten Organisationsnamen eintragen. Fachtheorie, Gestaltung, Exporte und Hinweise nach den Werkzeugdeck-Projektregeln ergänzen.
5. Tool in `tools.json` mit `Organisation/Repository` und einer geprüften vollständigen Commit-ID aufnehmen. Der Katalog prüft den Eigentümer verfügbarer Tools. Nach dem abgeschlossenen Umzug gibt es keine persönlichen Ausnahmen.
6. Organisationsübersicht und Fachgebietszuordnung ergänzen; Tests, Build und Browserprüfung durchführen. Downloads werden weiterhin ausschließlich gezielt freigegeben.

## Bestehende Repositories übertragen

- Lokale Git-Bundles aller acht Tools und des Website-Repositories wurden unter `Archiv/GitHub-Organisation-2026-11-21/` erstellt und mit `git bundle verify` geprüft. Das Manifest dokumentiert Quelladressen und Commitstände; eine Kopie des Katalogs und ein Patch lokaler Änderungen liegen daneben. Neue Commits seit der Sicherung vor dem Transfer berücksichtigen.
- Zuerst ein kleines Tool übertragen, Git-Commit und Zugriff prüfen und die entsprechende Ausnahme aus `legacyRepositories` entfernen. Erst danach weitere Tools umziehen. Git-Remotes, README-/Quellcodeverweise und Katalog aktualisieren.
- Das Website-Repository zuletzt übertragen. Alle festgeschriebenen Tool-Revisionsstände müssen nach dem Umzug abrufbar sein. GitHub-Anbindungen, Actions und Veröffentlichungszugriff auf die neue Organisation prüfen.
- Bestehendes Cloudflare-Pages-Projekt und Website-Adressen erhalten. Erst den vollständigen geprüften Build veröffentlichen. Keine alte GitHub-Adresse wieder mit einem neuen Repository belegen, solange deren Weiterleitung gebraucht wird.
- Archivierte Weiterleitungs-Repositories `EIS-Fitting-Web` und `Eintunken` bleiben vorerst beim persönlichen Konto, damit ihre GitHub-Pages-Adressen erhalten bleiben. Unabhängige private Projekte werden nicht übertragen.
- Der aktive Stand verwendet `status: active` und eine leere Liste `legacyRepositories`. Das Organisationsprofil liegt in `Werkzeugdeck/.github` unter `profile/README.md`. Bei neuen Tools dessen Übersicht aktualisieren.

## Verbindliche Kostenregel: 0 USD Zusatzkosten

Werkzeugdeck bleibt bei kostenlosen Diensten. Agenten dürfen keine Zahlungsmethode hinterlegen, kostenpflichtige Tarife oder Abonnements aktivieren, Ausgabenbudgets erhöhen oder kostenpflichtige Testangebote mit automatischer Verlängerung beginnen. Das gilt auch für Runner, Codespaces, zusätzlichen Speicher, Copilot-/KI-Lizenzen und Credits, Models, Spark, Sandbox, Marketplace-Apps und externe APIs. Bei ausgeschöpften Freigrenzen stoppen oder lokal weiterarbeiten. Bestehende Ausgabensperren niemals für eine Veröffentlichung umgehen. Diese Regel steht zusätzlich in der zentralen und jeder Tool-AGENTS.md sowie der Vorlage für neue Tools.

Am 22. November 2026 in den Organisationseinstellungen geprüft:

- GitHub Free ist aktiv; die Lizenzseite bietet Copilot Business zur Anmeldung an, ohne ein bestehendes entsprechendes Abonnement anzuzeigen.
- Actions, Packages, Codespaces und Git LFS haben jeweils ein organisationsweites Budget von 0 USD und den Status **Usage blocked**. Warnungen für enthaltene Nutzung sind eingeschaltet. Diese Sperren waren bereits eingerichtet.
- GitHub meldet eine fehlende Zahlungsmethode. Neue oder geänderte Budgets verlangen dort zuerst eine Zahlungsmethode; hierfür wird keine hinterlegt.
- Die angezeigten 0,08 USD Bruttonutzung sind durch 0,08 USD Rabatt gedeckt; der abrechenbare Betrag ist 0 USD. Bruttonutzung allein ist keine Rechnung.

Kostenlose Standard-Runner für öffentliche Repositories bleiben zulässig. Größere Runner sind auch bei öffentlichen Repositories kostenpflichtig und werden nicht eingesetzt. Der Website-Workflow lädt keine vollständigen Builds mehr als CI-Artefakt hoch; Fehler-Screenshots werden höchstens einen Tag aufbewahrt. Die Veröffentlichung verwendet weiterhin den lokal geprüften Build. Bestehende Artefakte werden nicht rückwirkend gelöscht.

Budgets gelten für ihre jeweiligen Produkte und ersetzen keine Kontrolle von Abonnements. Diese Prüfung ist eine Momentaufnahme; Administratoren könnten Einstellungen später ändern. Vor neuen Diensten sowie Änderungen an Tarifen, Sichtbarkeit oder Workflows die kostenlose Nutzbarkeit erneut prüfen. Keine automatischen Upgrades oder Nachkäufe.

Offizielle Erläuterungen: [GitHub-Budgets und Nutzungssperren](https://docs.github.com/en/billing/concepts/budgets-and-alerts), [Abrechnung von GitHub Actions](https://docs.github.com/en/billing/concepts/product-billing/github-actions).
