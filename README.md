# Legierungsatlas

Interaktiver Phasenatlas für Werkzeugdeck mit frei wählbaren Gehaltsschnitten.

## Metallmodelle

Ag–Cu–Sn, Bi–Pb–Sn sowie Sn–Bi und Sn–Cu werden aus der NIST-Lotdatenbank (Stand 2017-08-04) berechnet. Beide Reinstoffenden sind enthalten. Der Browser bestimmt für jede frei gewählte Zusammensetzung die Phasenanteile anhand der unteren konvexen Gibbs-Energie-Hülle. Die Bilanz erfolgt im vollständigen Zusammensetzungsraum.

- Umschaltung mol-% / Masse-% erhält die tatsächlichen Zusammensetzungen.
- Freie ternäre Schnittendpunkte durch Zahleneingabe und gezieltes Ziehen der Markierungen. Klicks in freie Flächen verändern keine Punkte.
- Liquidus-Isothermen und isotherme Schnitte, Konoden und Restschmelzpfad.
- Klare Phasenfelder oder Schmelzanteil als Farbverlauf.
- Liquidus und Anschmelzgrenze als separate Linien.
- Bis zu vier X-Punkte und beide Schnittendpunkte S₁/S₂ als Vergleichspunkte, mit synchroner Auswahl in der mitlaufenden Temperaturleiste.
- Phasenanteile, Phasenzusammensetzungen und Reaktionsfolgen.
- Direkt ablesbare Phasenanteile mit Einzelkurven oder gestapelten Flächen und gemeinsamer Ablesetemperatur.
- Schematische Gefügebilder mit Körnern, Lamellen, Primärkristallen und Reaktionssäumen; keine quantitative Morphologieprognose.
- Lokale PNG- und echte SVG-Exporte aller sechs Diagrammarten. Keine Wiedergabe- oder Videofunktion.

### Numerische Grenzen

Die Hülle approximiert die veröffentlichten Gibbs-Energie-Funktionen mit diskreten Zusammensetzungsstützstellen. In der zinnreichen Ecke werden zusätzliche Stützstellen mit 0,1 mol-% Abstand verwendet. Die Temperaturstützstellen sind in den Modelldateien enthalten. Grenztemperaturen werden als Intervalle ausgewiesen. Die ternären Modelle ergänzen regelmäßige Zusammensetzungsstützstellen durch direkt optimierte Gleichgewichtszustände. Homogene Mittelpunkte der Gibbs-Energie entscheiden über die Zusammenfassung von Phasenstützstellen; nichtkonvexe Chords bleiben als Entmischung getrennt. Die Liquidusfläche wird innerhalb der ursprünglichen Temperaturintervalle beruhigt, unter Erhaltung binärer Ränder, Reinstoffe und erkannter Primärphasenwechsel. Isothermen und die drehbare 3D-Ansicht verwenden dieselbe skalare Fläche. Schnittgrenzen werden an diese Fläche angepasst, soweit dies mit ihrem lokalen Temperaturintervall vereinbar ist. Phasenfelder und ihre hervorgehobenen Linien verwenden diese gemeinsamen Grenzen. Die Mengenbilanz bleibt eine lokale Abfrage der Gibbs-Hülle. Ein Vergleich mit direkten pycalphad-Gleichgewichten ist in tests dokumentiert. Die lokalen Ergebnisse sind Gleichgewichtszustände. Reale Umwandlungsgeschwindigkeiten und räumliche Gefügegrößen sind nicht berechnet.

### Reproduktion

Die Datei https://www.metallurgy.nist.gov/phase/solder/NIST-solder.tdb als NIST-solder.tdb neben den Generator speichern. Mit Python 3.12, pycalphad 0.12.0, NumPy und SciPy ausführen:

    python build-equilibria.py --system sac --density 1600 --grid 60 --refine
    python build-equilibria.py --system pbsnbi --density 1200 --grid 60 --refine
    python build-equilibria.py --system bisn --density 1600
    python build-equilibria.py --system cusn --density 2200

Die komprimierten Modelldateien werden lokal über DecompressionStream gelesen. Für die Anwendung genügt ein statischer HTTP-Server. Ein Rechendienst wird nicht benötigt.

## Darstellung und Systembibliothek

Die Bibliothek unterstützt Symbol-/Namenssuche, binär/ternär, Metalle/Salze und lokal gespeicherte Favoriten. Datenpakete und Fähigkeiten sind pro System beschrieben. Für Bi–Pb–Sn sind die NIST-Prüfpunkte 98,0 °C (ternäres Eutektikum) und 135,7 °C (Übergangsreaktion) referenziert; das System enthält zusätzlich ε-Pb und ist kein ideales Dreistoffeutektikum.

Die 3D-Ansicht zeigt die Liquidusfläche, die drei binären Randkurven und die gewählte Schnittebene. Sie lässt sich mit Maus, Touch und Pfeiltasten drehen. Sie stellt noch keine vollständigen Phasenvolumina dar. PNG/SVG bewahren die aktuelle Orientierung.

Die Restschmelze wird bis zum letzten flüssigen Modellzustand verfolgt. Eine auf 3 mol-% begrenzte Extrapolation aus den letzten beiden Restschmelzzuständen kann ihren Grenzgehalt bei verschwindendem Flüssiganteil ergänzen. Es wird kein globales Eutektikum erzwungen; fehlende Komponenten bleiben fehlend.

In erkennbaren binären eutektischen Fällen unterscheidet die Gefügeskizze Primärkristalle und eutektisches Gemisch. Die näherungsweise Erstarrungsbilanz stammt aus der letzten Restschmelze, nicht aus den aktuellen Gesamtphasenanteilen. Sie ist keine Berechnung räumlicher Morphologie oder von Volumenanteilen. Grundlage: Bargel/Siemer, Werkstoffkunde, 14. Auflage, Abschnitte 1.3 und 1.6, doi:10.1007/978-3-662-71672-4.

## Salzreferenz

AlCl₃–NaCl–KCl zeigt den veröffentlichten Schnitt bei 40 mol-% AlCl₃ und 1 bar aus ORNL/SPR-2021/2102, Abb. 6. Linien wurden aus der Grafik abgelesen und zwischen den Stützstellen linear verbunden. Robelin, Chartrand und Pelton (2004), doi:10.1016/j.jct.2004.04.011 liefert die Stoffdaten (Tabelle 1), optimierte Wechselwirkungsparameter (Gleichungen 12, 17, 18, 20, 21) und Vergleichsschnitte. Eine freie Salzrechnung erfordert noch die Umsetzung des referenzierten modifizierten quasichemischen Formalismus und dessen Validierung. Die vom Nutzer bereitgestellte Verlags-PDF wird nicht mitveröffentlicht.

Prüffall aus Abb. 18: quasibinär NaAlCl₄–KAlCl₄, Reinstoff-Schmelzpunkte 156,7 / 257,3 °C, Eutektikum 133,2 °C bei x(KAlCl₄)=0,278. In diesem Teilsystem nehmen die Autoren keine gegenseitige feste Löslichkeit an. Diese Literaturwerte sind noch kein berechnetes Salzmodell. Massenumrechnung und Vergleichspunkte stehen für den belegten Schnitt zur Verfügung.

## Prüfung gegen direkte Gleichgewichte

Die 26 gespeicherten Vergleichszustände in tests/reference-v3.json wurden mit direkten pycalphad-Gleichgewichten berechnet. Die größte absolute Abweichung eines Phasenanteils beträgt bei diesem Stand 0,343 Prozentpunkte. Das prüft die numerische Näherung, nicht die experimentelle Gültigkeit der NIST-Modellparameter. Die Referenzgenerierung ist mit validate-models.py reproduzierbar.

## Prüfen

    npm test

Für die Browserprüfung einen eigenständigen Playwright-Chromium verwenden:

    node tests/browser-check.cjs

WERKZEUGDECK_PLAYWRIGHT zeigt auf das vorhandene Playwright-Paket. Microsoft Edge wird nicht verwendet. Die Prüfung umfasst beide Prozentbasen, freie Schnitte, beide Reinstoffenden, Eutektikumsvergleich, Bildexport aller Diagrammarten, glatte Konturen, Ablesewerte, Gefügeskizzen, korrekte Elementsymbole sowie Desktop und Mobilansicht. Prüfdateien unter qa/ sind lokal und werden nicht veröffentlicht.

Nutzung als privates Lernprojekt. Quellen, Berechnungsgrenzen und Haftungshinweise stehen in der Anwendung.

## Spätere Desktop-Richtung

Eine gemeinsame Werkstoffkunde.exe soll den Legierungsatlas, den geplanten Aluminiumgefügerechner und geeignete weitere Werkstoffkunde-Module zusammenführen. Die aktuelle Ausbaustufe bleibt eine lokale Browseranwendung; es wird noch kein EXE-Paket erstellt. Online-Darstellung und spätere Desktop-Version sollen gemeinsame Datenformate und Diagrammkomponenten verwenden.
