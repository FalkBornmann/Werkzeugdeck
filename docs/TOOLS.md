# Weitere Tools einordnen

Alle Werkzeuge werden als Themenordner im gemeinsamen Repository FalkBornmann/Werkzeugdeck entwickelt. Die öffentliche Adresse /tools/<id>/ bleibt bei fachlicher Umordnung gleich. Keine neuen Tool-Repositories, Submodule oder verschachtelten .git-Verzeichnisse anlegen. Projektregeln und Kostenlosigkeit: [Repository und Kostenregel](GITHUB-ORGANISATION.md).

## Kategorien

- `domains` beschreibt Fachgebiete wie Elektrochemie, Stofftransport oder Beschichtungen. Mehrere Zuordnungen sind möglich.
- `activity` beschreibt die Aufgabe wie Datenauswertung, Simulation oder Bildanalyse.
- `collections` bündelt zusätzliche Einstiege wie Theoretische Spielereien.
- `tags` enthält Suchbegriffe.
- `status` ist `planned` oder `available`.

Die lokale Ordnung kann weiter verwendet werden. `sourceDirectory` gibt den lokalen Toolordner an. Ein frischer Checkout enthält alle Quellen; der Build kopiert die freigegebenen Dateien direkt aus diesem Ordner.

## Vorhaben

Zuerst ID, Titel, Beschreibung, Fachgebiete, Tätigkeit, Sammlungen und Schlagwörter eintragen. Ein geplantes Tool erhält keinen Startlink und benötigt weder Repository noch Quellcodedateien.

## Verfügbares Tool

1. Einen Themenordner mit README, Tool-Dateien und eigener AGENTS.md aus templates/tool-AGENTS.md anlegen.
2. `repository` auf `FalkBornmann/Werkzeugdeck` setzen und `sourceDirectory` als eindeutigen relativen Themenpfad eintragen. Keine getrennten Revisionspins verwenden.
3. In `assets` ausschließlich benötigte Browserdateien angeben. Keine privaten Messdateien, virtuellen Umgebungen oder Zugangsdaten veröffentlichen.
4. Kategorien und Schlagwörter zuordnen. Neue Fachgebiete und Tätigkeiten zuerst in der entsprechenden Liste ergänzen.
5. Sichtbare Grundlagen, erste Schritte, Ergebnisinterpretation und aufklappbare Theorie mit Verfahren, Annahmen, Grenzen und eingeordneten Fachquellen anbieten.
   Die Fachtheorie in `content/theory.mjs` um die neuen Zusammenhänge erweitern und das Tool in den passenden Kapiteln verknüpfen. Fachgebietsfarben und Aufgabenpiktogramme gemäß `docs/DESIGN.md` verwenden.
6. Orientierungspfad zur Fachgebietsseite, Projektkennzeichnung und zutreffende Datenverarbeitungs- und Nutzungshinweise ergänzen.
7. `npm test` und `npm run build` ausführen, Navigation und Tool im Browser prüfen und den vollständigen Build veröffentlichen.

## Simulierte Zeitabläufe

Zeitpunkt und Wiedergabe müssen von jeder Grafik aus ohne Scrollen der Seite bedienbar sein. Eine kompakte, feste Leiste am unteren Bildschirmrand ist die Referenzlösung. `templates/timeline-dock.js` und `templates/timeline-dock.css` verschieben die bestehenden Steuerelemente in diese Leiste. Es gibt weiterhin nur eine Zeitleiste und einen ausgewählten Zeitpunkt. Individuelle Lösungen sind möglich, wenn sie dieselbe Erreichbarkeit bieten.

Die Leiste nur für berechnete, gültige Zeitverläufe aktivieren. Beim Verlassen des Simulationsmodus oder Ungültigwerden der Ergebnisse deaktivieren. Den Platz dynamisch reservieren, Bildschirm-Sicherheitsabstände berücksichtigen und Tastaturfokus sichtbar halten. Die zugängliche Wertbeschreibung nennt die tatsächliche Simulationszeit statt nur eines Frame-Index. Vorhandene Wiedergabe-, Anfangs-/End- und Tempooptionen bleiben erhalten.

In modalen oder vergrößerten Diagrammansichten muss die Steuerung ebenfalls erreichbar sein. Die Referenz bietet `setHost(dialog)`, um dieselbe Leiste in den Dialog zu verschieben. Beim Schließen wieder `setHost(document.body)` verwenden. Die vergrößerte Grafik bei jedem Zeitpunktwechsel aus demselben Zustand neu zeichnen.

Mindestens in Desktop- und schmaler Mobilansicht bei jeder Grafik testen: Ist die Zeitsteuerung sichtbar und bedienbar? Verändern Ziehen und Tastatur denselben Zustand in allen Grafiken? Funktionieren Pause, Anfang und Ende? Werden Controls nach Moduswechsel oder Neuberechnung korrekt zurückgesetzt?

`node scripts/check-timelines.cjs` prüft diese Punkte nach dem gemeinsamen Build in einem isolierten Browser einschließlich Maus, Touch und vergrößerter Ansicht. Playwright lässt sich über `WERKZEUGDECK_PLAYWRIGHT`, der Browser über `EIS_BROWSER` angeben. Screenshots werden unter `Archiv/Timeline-Pruefung/` gespeichert.

## Grafikexport in den Tools

PNG, SVG und gegebenenfalls Video werden im gemeinsamen Exportmenü ausgewählt. Es gibt eine Auswahl der Darstellung, eine Auswahl des Dateityps und eine Speichern-Schaltfläche. Standard ist eine sinnvolle Übersicht als PNG. Numerische CSV- und Projektexporte bleiben separat. Die Referenz `templates/export-menu.js` unterstützt auch lokale Videos aus Canvas- oder SVG-basierten Simulationen. Für neue Zeitabläufe Videoexport einschließlich Abbrechen, Zustandserhalt und Browser-Fallback ergänzen.

Jede erzeugte Grafik erhält PNG- und SVG-Export. SVG enthält Pfade, Flächen und Text statt eingebetteter Rasterbilder. Achsen, Einheiten, Fitlinien, Markierungen und ausgewählte Zeitpunkte müssen dem sichtbaren Zustand entsprechen. Bei Simulationen den aktuellen Zustand für den Export einfrieren.

Vorhandene SVG-Darstellungen direkt serialisieren. Canvas-Zeichenroutinen können einen optionalen Kontext erhalten und für den SVG-Export erneut ausgeführt werden. `templates/svg-context.js` ist die Referenz für die derzeit verwendeten Canvas-Operationen und wird in den Tool-Ordnern mitgeführt. Bei neuen Zeichenoperationen den Exportkontext erweitern und prüfen.

SVG-Dateien auf gültiges XML, eigenständige Darstellung, Beschriftungen und fehlende Rastereinbettungen testen. PNG weiterhin prüfen. Neue Exportdateien in die Asset-Liste und gegebenenfalls den eigenständigen Tool-Build aufnehmen.

## Neue Version veröffentlichen

Änderungen im Tool-Ordner, Katalog und Fachtheorie gemeinsam prüfen und committen. Lokal Modelltests, npm test, npm run build und die passenden Chromium-Browserprüfungen ausführen. Den geprüften vollständigen dist/-Ordner direkt im bestehenden Cloudflare-Pages-Free-Projekt veröffentlichen und anschließend den Live-Stand prüfen. GitHub Actions bleibt deaktiviert; keine Workflows hinzufügen.

Vorhandene Adressen in `aliases` eintragen. Daraus erzeugt der Build Cloudflare-Weiterleitungen zur festen Tool-Adresse.
