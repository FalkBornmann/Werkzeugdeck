# Weitere Tools einordnen

Ein Tool besitzt ein eigenes Repository und eine dauerhafte ID. Die öffentliche Adresse lautet `/tools/<id>/`. Fachliche Umordnungen verändern diese Adresse nicht.

## Kategorien

- `domains` beschreibt Fachgebiete wie Elektrochemie, Stofftransport oder Beschichtungen. Mehrere Zuordnungen sind möglich.
- `activity` beschreibt die Aufgabe wie Datenauswertung, Simulation oder Bildanalyse.
- `collections` bündelt zusätzliche Einstiege wie Theoretische Spielereien.
- `tags` enthält Suchbegriffe.
- `status` ist `planned` oder `available`.

Die lokale Ordnung kann weiter verwendet werden. `sourceDirectory` gibt den lokalen Toolordner an. Bei einem frischen Checkout bezieht der Build die Quellen aus den öffentlichen Tool-Repositories.

## Vorhaben

Zuerst ID, Titel, Beschreibung, Fachgebiete, Tätigkeit, Sammlungen und Schlagwörter eintragen. Ein geplantes Tool erhält keinen Startlink und benötigt weder Repository noch Quellcodedateien. Beim NSS-Vorhaben bleiben Auswertungsmethode und Validierung bis zur Entwicklung offen.

## Verfügbares Tool

1. Ein eigenes Repository mit README und Tool-Dateien anlegen.
2. `repository` als `Eigentümer/Name` und `revision` als vollständige Commit-ID ergänzen.
3. In `assets` ausschließlich benötigte Browserdateien angeben. Keine privaten Messdateien, virtuellen Umgebungen oder Zugangsdaten veröffentlichen.
4. Kategorien und Schlagwörter zuordnen. Neue Fachgebiete und Tätigkeiten zuerst in der entsprechenden Liste ergänzen.
5. Sichtbare Grundlagen, erste Schritte, Ergebnisinterpretation und aufklappbare Theorie mit Verfahren, Annahmen, Grenzen und eingeordneten Fachquellen anbieten.
6. Orientierungspfad zur Fachgebietsseite, Projektkennzeichnung und zutreffende Datenverarbeitungs- und Nutzungshinweise ergänzen.
7. `npm test` und `npm run build` ausführen, Navigation und Tool im Browser prüfen und den vollständigen Build veröffentlichen.

## Grafikexport

Jede erzeugte Grafik erhält PNG- und SVG-Export. SVG enthält Pfade, Flächen und Text statt eingebetteter Rasterbilder. Achsen, Einheiten, Fitlinien, Markierungen und ausgewählte Zeitpunkte müssen dem sichtbaren Zustand entsprechen. Bei Simulationen den aktuellen Zustand für den Export einfrieren.

Vorhandene SVG-Darstellungen direkt serialisieren. Canvas-Zeichenroutinen können einen optionalen Kontext erhalten und für den SVG-Export erneut ausgeführt werden. `templates/svg-context.js` ist die Referenz für die derzeit verwendeten Canvas-Operationen und wird in den unabhängigen Tool-Repositories mitgeführt. Bei neuen Zeichenoperationen den Exportkontext erweitern und prüfen.

SVG-Dateien auf gültiges XML, eigenständige Darstellung, Beschriftungen und fehlende Rastereinbettungen testen. PNG weiterhin prüfen. Neue Exportdateien in die Asset-Liste und gegebenenfalls den eigenständigen Tool-Build aufnehmen.

## Neue Version veröffentlichen

Änderungen im Tool-Repository committen und pushen. Danach `revision` im Katalog aktualisieren und die gemeinsame Website bauen. So bleibt nachvollziehbar, welche Tool-Version veröffentlicht wird.

Vorhandene Adressen in `aliases` eintragen. Daraus erzeugt der Build Cloudflare-Weiterleitungen zur festen Tool-Adresse.
