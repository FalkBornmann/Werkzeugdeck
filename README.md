# Legierungsatlas

Interaktiver Phasenatlas für Werkzeugdeck mit frei wählbaren Gehaltsschnitten.

## Metallmodelle

Ag–Cu–Sn sowie Sn–Bi und Sn–Cu werden aus der NIST-Lotdatenbank (Stand 2017-08-04) berechnet. Beide Reinstoffenden sind enthalten. Der Browser bestimmt für jede frei gewählte Zusammensetzung die Phasenanteile anhand der unteren konvexen Gibbs-Energie-Hülle. Die Bilanz erfolgt im vollständigen Zusammensetzungsraum.

- Umschaltung mol-% / Masse-% erhält die tatsächlichen Zusammensetzungen.
- Freie ternäre Schnittendpunkte durch Zahleneingabe, Klick und Ziehen.
- Liquidus-Isothermen und isotherme Schnitte, Konoden und Restschmelzpfad.
- Klare Phasenfelder oder Schmelzanteil als Farbverlauf.
- Liquidus und Anschmelzgrenze als separate Linien.
- Bis zu vier Vergleichspunkte mit Einrastzielen und Links/Rechts-Vergleich.
- Phasenanteile, Phasenzusammensetzungen und Reaktionsfolgen.
- Gemeinsame Abkühlsteuerung, lokale PNG-/SVG- und Videoexporte.

### Numerische Grenzen

Die Hülle approximiert die veröffentlichten Gibbs-Energie-Funktionen mit diskreten Zusammensetzungsstützstellen. In der zinnreichen Ecke werden zusätzliche Stützstellen mit 0,1 mol-% Abstand verwendet. Die Temperaturstützstellen sind in den Modelldateien enthalten. Grenztemperaturen werden als Intervalle ausgewiesen. Ein Vergleich mit direkten pycalphad-Gleichgewichten ist in tests dokumentiert. Die lokalen Ergebnisse sind Gleichgewichtszustände. Reale Umwandlungsgeschwindigkeiten und räumliche Gefügegrößen sind nicht berechnet.

### Reproduktion

Die Datei https://www.metallurgy.nist.gov/phase/solder/NIST-solder.tdb als NIST-solder.tdb neben den Generator speichern. Mit Python 3.12, pycalphad 0.12.0, NumPy und SciPy ausführen:

    python build-equilibria.py --system sac --density 1600
    python build-equilibria.py --system bisn --density 1600
    python build-equilibria.py --system cusn --density 2200

Die komprimierten Modelldateien werden lokal über DecompressionStream gelesen. Für die Anwendung genügt ein statischer HTTP-Server. Ein Rechendienst wird nicht benötigt.

## Salzreferenz

AlCl₃–NaCl–KCl zeigt den veröffentlichten Schnitt bei 40 mol-% AlCl₃ und 1 bar aus ORNL/SPR-2021/2102, Abb. 6. Linien wurden aus der Grafik abgelesen und zwischen den Stützstellen linear verbunden. Für eine freie Salzberechnung fehlt derzeit die vollständige Modell-Datei. Der ORNL-Dateizugriff meldete am 19.11.2026 HTTP 403. Massenumrechnung und Vergleichspunkte stehen für den belegten Schnitt zur Verfügung.

## Prüfen

    npm test

Für die Browserprüfung einen eigenständigen Playwright-Chromium verwenden:

    node tests/browser-check.cjs

WERKZEUGDECK_PLAYWRIGHT zeigt auf das vorhandene Playwright-Paket. Microsoft Edge wird nicht verwendet. Die Prüfung umfasst beide Prozentbasen, freie Schnitte, beide Reinstoffenden, Eutektikumsvergleich, Bildexport, Videoexport, Abbruch, Fehlerfall, Track-Bereinigung, Wiedergabe sowie Desktop und Mobilansicht. Prüfdateien unter qa/ sind lokal und werden nicht veröffentlicht.

Nutzung als privates Lernprojekt. Quellen, Berechnungsgrenzen und Haftungshinweise stehen in der Anwendung.

