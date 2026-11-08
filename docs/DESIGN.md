# Gemeinsames Design und Exportbedienung

## Fachgebiete

| Fachgebiet | Dunkler Kopfbereich | Akzent | Heller Hintergrund |
| --- | --- | --- | --- |
| Elektrochemie | #163e50 | #176b8b | #edf5fa |
| Stofftransport | #193e35 | #24745d | #edf5ee |
| Beschichtungen | #4a3455 | #77508c | #f4eff7 |
| Werkstofftechnik | #513821 | #8b5e2f | #f8f1e8 |

Die gemeinsame Formensprache verwendet sandfarbene Trennlinien, helle Karten, Systemschriften, klare Überschriften und mindestens 44 px hohe Bedienelemente. `templates/tool-theme.css` wird in jedem eigenständigen Tool mitgeführt. Die Farben ändern die Orientierungselemente, nicht die Bedeutung von Datenreihen, Phasenfarben oder Fehlermeldungen. Farbe wird immer durch ein Textlabel ergänzt.

`scripts/design.mjs` definiert dieselben Fachgebietsfarben und die Aufgabenpiktogramme. Simulation erhält ein Wiedergabedreieck, Datenauswertung ein Kurvendiagramm, Bildanalyse einen Bildrahmen. Diese Zeichen werden mit dem Aufgabennamen dargestellt. Eigene Tool-Logos können später ergänzend verwendet werden.

## Orientierung und Theorie

Jedes Tool verlinkt die Fachgebietsübersicht und deren Lernweg unter `/bereiche/<fachgebiet>/theorie/`. Auf der Fachgebietsseite steht eine gut erkennbare Theorie-Kachel vor den Werkzeugen. Die Theorie ist ohne JavaScript lesbar und besitzt Inhaltsverzeichnis, verständliche Absätze und aufklappbare Vertiefungen.

Neue Tools müssen fachlich in `content/theory.mjs` eingeordnet werden. Bestehende Kapitel bei neuen Mechanismen oder Annahmen erweitern. Fachquellen nennen und erklären, welche Aussagen sie stützen. Tool-spezifische Modellparameter und freie Lehrannahmen als solche kennzeichnen. Der Build verhindert die Veröffentlichung neuer verfügbarer Tools ohne Theoriezuordnung.

## Kompaktes Speichern

Ein gemeinsames Menü pro Tool bietet Darstellung, Dateityp und Speichern. Gute Standardwerte sind Gesamtübersicht/PNG bei EIS-Fitting, aktuelles Diagramm/PNG bei Potentialkurven, Querschnitt/PNG bei Keks und Tee, Winand-Diagramm/PNG bei Winand und Temperaturverlauf/PNG beim Gefügerechner.

PNG und SVG verwenden denselben sichtbaren Zustand. SVG enthält Vektorelemente und Text. CSV und Projektdateien bleiben eigene Datenexporte. Die Referenzimplementierung liegt in `templates/export-menu.js` und wird wie die Gestaltung in den unabhängigen Tool-Repositories mitgeführt.

## Video

Zeitabhängige Darstellungen erhalten zusätzlich Video im Dateityp-Menü. Eine Filmlänge von 10 s ist vorausgewählt, 5 und 20 s sind weitere Optionen. Der berechnete Verlauf wird vom Anfang bis zum Ende zeitlich verdichtet. Aufnahme und Kodierung erfolgen auf dem Gerät, ohne Ton, Kamera oder Mikrofon. Der Browser bestimmt, welches Aufnahmeformat verfügbar ist. WebM wird bevorzugt, MP4 verwendet, wenn nur dieses Format unterstützt wird. PNG und SVG bleiben bei fehlender Aufnahmeunterstützung nutzbar.

Der Nutzer hält während der Aufnahme den Tab aktiv. Auf langsamen Geräten können Erzeugung und Videolänge von der Vorgabe abweichen. Simulationszeit und Modellhinweis werden eingeblendet. Die Eingaben sind während der Aufnahme gesperrt. Abbrechen und Fehler stellen den vorherigen Zeitpunkt wieder her. Medien-Tracks und Objekt-URLs werden freigegeben.

## Prüfen

`node scripts/check-ui-video.cjs` prüft Theorie-Navigation, alle Exportmenüs, drei tatsächliche Videodateien, wechselnde Videobilder, Abbruch, Wiederherstellung und Browser-Fallback. `node scripts/check-exports.cjs` prüft PNG/SVG über die neuen Menüs. `node scripts/check-timelines.cjs` prüft die mitlaufende Zeitsteuerung. Die Browserprüfungen benötigen Playwright und einen Chromium-Browser. Deren Pfade können über `WERKZEUGDECK_PLAYWRIGHT` und `EIS_BROWSER` angegeben werden.
