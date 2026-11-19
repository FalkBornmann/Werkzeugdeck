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
- Direkt ablesbare Phasenanteile mit Einzelkurven oder gestapelten Flächen und gemeinsamer Ablesetemperatur.
- Schematische Gefügebilder mit Körnern, Lamellen, Primärkristallen und Reaktionssäumen; keine quantitative Morphologieprognose.
- Lokale PNG- und echte SVG-Exporte aller fünf Diagrammarten. Keine Wiedergabe- oder Videofunktion.

### Numerische Grenzen

Die Hülle approximiert die veröffentlichten Gibbs-Energie-Funktionen mit diskreten Zusammensetzungsstützstellen. In der zinnreichen Ecke werden zusätzliche Stützstellen mit 0,1 mol-% Abstand verwendet. Die Temperaturstützstellen sind in den Modelldateien enthalten. Grenztemperaturen werden als Intervalle ausgewiesen. Die Anzeige verbindet Konturen zusammenhängend und rundet sie; Phasenfeldgrenzen werden formtreu interpoliert. Die thermodynamischen Stützwerte und Genauigkeitsintervalle bleiben unverändert. Ein Vergleich mit direkten pycalphad-Gleichgewichten ist in tests dokumentiert. Die lokalen Ergebnisse sind Gleichgewichtszustände. Reale Umwandlungsgeschwindigkeiten und räumliche Gefügegrößen sind nicht berechnet.

### Reproduktion

Die Datei https://www.metallurgy.nist.gov/phase/solder/NIST-solder.tdb als NIST-solder.tdb neben den Generator speichern. Mit Python 3.12, pycalphad 0.12.0, NumPy und SciPy ausführen:

    python build-equilibria.py --system sac --density 1600
    python build-equilibria.py --system bisn --density 1600
    python build-equilibria.py --system cusn --density 2200

Die komprimierten Modelldateien werden lokal über DecompressionStream gelesen. Für die Anwendung genügt ein statischer HTTP-Server. Ein Rechendienst wird nicht benötigt.

## Salzreferenz

AlCl₃–NaCl–KCl zeigt den veröffentlichten Schnitt bei 40 mol-% AlCl₃ und 1 bar aus ORNL/SPR-2021/2102, Abb. 6. Linien wurden aus der Grafik abgelesen und zwischen den Stützstellen linear verbunden. Robelin, Chartrand und Pelton (2004), doi:10.1016/j.jct.2004.04.011 liefert die Stoffdaten (Tabelle 1), optimierte Wechselwirkungsparameter (Gleichungen 12, 17, 18, 20, 21) und Vergleichsschnitte. Eine freie Salzrechnung erfordert noch die Umsetzung des referenzierten modifizierten quasichemischen Formalismus und dessen Validierung. Die vom Nutzer bereitgestellte Verlags-PDF wird nicht mitveröffentlicht.

Prüffall aus Abb. 18: quasibinär NaAlCl₄–KAlCl₄, Reinstoff-Schmelzpunkte 156,7 / 257,3 °C, Eutektikum 133,2 °C bei x(KAlCl₄)=0,278. In diesem Teilsystem nehmen die Autoren keine gegenseitige feste Löslichkeit an. Diese Literaturwerte sind noch kein berechnetes Salzmodell. Massenumrechnung und Vergleichspunkte stehen für den belegten Schnitt zur Verfügung.

## Prüfen

    npm test

Für die Browserprüfung einen eigenständigen Playwright-Chromium verwenden:

    node tests/browser-check.cjs

WERKZEUGDECK_PLAYWRIGHT zeigt auf das vorhandene Playwright-Paket. Microsoft Edge wird nicht verwendet. Die Prüfung umfasst beide Prozentbasen, freie Schnitte, beide Reinstoffenden, Eutektikumsvergleich, Bildexport aller Diagrammarten, glatte Konturen, Ablesewerte, Gefügeskizzen, korrekte Elementsymbole sowie Desktop und Mobilansicht. Prüfdateien unter qa/ sind lokal und werden nicht veröffentlicht.

Nutzung als privates Lernprojekt. Quellen, Berechnungsgrenzen und Haftungshinweise stehen in der Anwendung.
