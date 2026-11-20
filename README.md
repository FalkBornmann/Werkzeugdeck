# Legierungsatlas

Interaktiver Phasenatlas für Werkzeugdeck mit frei wählbaren Gehaltsschnitten.

## Metallmodelle

Ag–Cu–Sn, Bi–Pb–Sn sowie Sn–Bi und Sn–Cu werden aus der NIST-Lotdatenbank (Stand 2017-08-04) berechnet. Beide Reinstoffenden sind enthalten. Der Browser bestimmt für jede frei gewählte Zusammensetzung die Phasenanteile anhand der unteren konvexen Gibbs-Energie-Hülle. Die Bilanz erfolgt im vollständigen Zusammensetzungsraum.

- Umschaltung mol-% / Masse-% erhält die tatsächlichen Zusammensetzungen.
- Freie ternäre Schnittendpunkte durch Zahleneingabe und gezieltes Ziehen der Markierungen. Klicks in freie Flächen verändern keine Punkte.
- Glatte Liquidus-Isothermen aus direkten Sättigungszuständen, isotherme Schnitte, Konoden und Restschmelzpfad.
- Eutektische, peritektische und Übergangspunkte mit Literaturtemperaturen; rekonstruierte Reaktionslinien mit Pfeilen zu tieferen Temperaturen.
- Klare Phasenfelder oder Schmelzanteil als Farbverlauf.
- Liquidus und Anschmelzgrenze als separate Linien.
- Bis zu vier X-Punkte und beide Schnittendpunkte S₁/S₂ als Vergleichspunkte, mit synchroner Auswahl in der mitlaufenden Temperaturleiste.
- Phasenanteile, Phasenzusammensetzungen und Reaktionsfolgen.
- Direkt ablesbare Phasenanteile mit Einzelkurven oder gestapelten Flächen und gemeinsamer Ablesetemperatur.
- Schematische Gefügebilder mit Körnern, Lamellen, Primärkristallen und Reaktionssäumen; keine quantitative Morphologieprognose.
- Lokale PNG- und echte SVG-Exporte aller sieben Diagrammarten. Keine Wiedergabe- oder Videofunktion.

### Numerische Grenzen

Die Hülle approximiert die veröffentlichten Gibbs-Energie-Funktionen mit diskreten Zusammensetzungsstützstellen. In der zinnreichen Ecke werden zusätzliche Stützstellen mit 0,1 mol-% Abstand verwendet. Die Temperaturstützstellen sind in den Modelldateien enthalten. Grenztemperaturen werden als Intervalle ausgewiesen. Die ternären Modelle ergänzen regelmäßige Zusammensetzungsstützstellen durch direkt optimierte Gleichgewichtszustände. Homogene Mittelpunkte der Gibbs-Energie entscheiden über die Zusammenfassung von Phasenstützstellen; nichtkonvexe Chords bleiben als Entmischung getrennt. Die Liquidusdarstellung wird zusätzlich an über 2000 direkt berechneten Sättigungspunkten je ternärem System verankert. Der Offline-Solver fixiert die feste Phase bei null Anteil und gibt die Temperatur frei. Vollständige Gleichgewichte ober- und unterhalb prüfen den Übergang; ein Bisection-Fallback ergänzt schwierige Punkte. Die Darstellungsfläche ist eine stetig differenzierbare Clough–Tocher-Interpolation der geprüften Liquidustemperaturen auf einem dichten n=240-Netz. Sie kann sehr schmale Knicke verrunden. Primärfelder und ihre Grenzgraphen werden aus den Sättigungszweigen in direkt belegten Primärgebieten rekonstruiert. Eine begrenzte geometrische Beruhigung entfernt Rasterecken der dargestellten Reaktionslinien unter Erhaltung ihrer Knoten. Pfeile folgen dem Temperaturgefälle. Diese Graphen sind rekonstruierte Näherungen, keine exakte Verfolgung aller univarianten Gleichgewichte. Isothermen, 3D und die hervorgehobene Schnittliquiduslinie verwenden dieselbe skalare Darstellungsfläche. Die Mengenbilanz bleibt eine lokale Abfrage der Gibbs-Hülle. Ein Vergleich mit direkten pycalphad-Gleichgewichten ist in tests dokumentiert. Die Temperaturwahl ändert keine Diagrammachse. Der Schnitt zeigt wahlweise den gesamten Datenbereich, alle Phasenwechsel mit Rand oder ein festes eigenes Fenster. Abkühlkurven zeigen stets den gesamten berechneten Temperaturverlauf. Der Datenbereich wird nicht über seine Untergrenze hinaus extrapoliert. Die lokalen Ergebnisse sind Gleichgewichtszustände. Reale Umwandlungsgeschwindigkeiten und räumliche Gefügegrößen sind nicht berechnet.

### Reproduktion

Die Datei https://www.metallurgy.nist.gov/phase/solder/NIST-solder.tdb als NIST-solder.tdb neben den Generator speichern. Mit Python 3.12, pycalphad 0.12.0, NumPy und SciPy ausführen:

    python build-equilibria.py --system sac --density 1600 --grid 60 --refine
    python build-equilibria.py --system pbsnbi --density 1200 --grid 60 --refine
    python build-equilibria.py --system bisn --density 1600
    python build-equilibria.py --system cusn --density 2200
    node surface-seeds.mjs
    python build-liquidus.py sac
    python build-liquidus.py pbsnbi
    python validate-liquidus.py sac
    python validate-liquidus.py pbsnbi

Die komprimierten Modelldateien werden lokal über DecompressionStream gelesen. Für die Anwendung genügt ein statischer HTTP-Server. Ein Rechendienst wird nicht benötigt.

## Darstellung und Systembibliothek

Die Bibliothek unterstützt Symbol-/Namenssuche, binär/ternär, Metalle/Salze und lokal gespeicherte Favoriten. Datenpakete und Fähigkeiten sind pro System beschrieben. Für Bi–Pb–Sn sind die NIST-Prüfpunkte 98,0 °C (ternäres Eutektikum) und 135,7 °C (Übergangsreaktion) referenziert; das System enthält zusätzlich ε-Pb und ist kein ideales Dreistoffeutektikum.

Die 3D-Ansicht zeigt die Liquidusfläche mit Isothermen, die drei binären Randkurven, binäre Phasenfelder als ausblendbare Flächen auf den Seitenebenen und die gewählte Schnittebene. Die gewählte binäre Seite wird exakt nach vorne gedreht. Sie lässt sich mit Maus, Touch und Pfeiltasten drehen. Sie stellt noch keine vollständigen Phasenvolumina dar. PNG/SVG bewahren die aktuelle Orientierung.

Die Restschmelze wird bis zum letzten flüssigen Modellzustand verfolgt. Eine auf 3 mol-% begrenzte Extrapolation aus den letzten beiden Restschmelzzuständen kann ihren Grenzgehalt bei verschwindendem Flüssiganteil ergänzen. Es wird kein globales Eutektikum erzwungen; fehlende Komponenten bleiben fehlend.

In erkennbaren binären und ternären eutektischen Enderstarrungen unterscheidet die Gefügeskizze Primärkristalle und eutektisches Gemisch. Ein vorausgeschiedener ternärer Anteil kann bereits mehrere Phasen enthalten. Die automatische Skizze berücksichtigt vorhandene peritektische Kerne und Produkte. Eine Tabelle zeigt die berechnete Phasenfolge; eine eigene Vektorgrafik erläutert Hebelgesetz und Konodendreieck. Keimbildung und gerichteter Wärmefluss sind qualitative Bildoptionen. Die näherungsweise Erstarrungsbilanz stammt aus der letzten Restschmelze, nicht aus den aktuellen Gesamtphasenanteilen. Sie ist keine Berechnung räumlicher Morphologie oder von Volumenanteilen. Grundlage: Bargel/Siemer, Werkstoffkunde, 14. Auflage, Abschnitte 1.3 und 1.6, doi:10.1007/978-3-662-71672-4.

## Salzreferenz

AlCl₃–NaCl–KCl zeigt den veröffentlichten Schnitt bei 40 mol-% AlCl₃ und 1 bar aus ORNL/SPR-2021/2102, Abb. 6. Linien wurden aus der Grafik abgelesen und zwischen den Stützstellen linear verbunden. Robelin, Chartrand und Pelton (2004), doi:10.1016/j.jct.2004.04.011 liefert die Stoffdaten (Tabelle 1), optimierte Wechselwirkungsparameter (Gleichungen 12, 17, 18, 20, 21) und Vergleichsschnitte. Eine freie Salzrechnung erfordert noch die Umsetzung des referenzierten modifizierten quasichemischen Formalismus und dessen Validierung. Die vom Nutzer bereitgestellte Verlags-PDF wird nicht mitveröffentlicht.

Prüffall aus Abb. 18: quasibinär NaAlCl₄–KAlCl₄, Reinstoff-Schmelzpunkte 156,7 / 257,3 °C, Eutektikum 133,2 °C bei x(KAlCl₄)=0,278. In diesem Teilsystem nehmen die Autoren keine gegenseitige feste Löslichkeit an. Diese Literaturwerte sind noch kein berechnetes Salzmodell. Massenumrechnung und Vergleichspunkte stehen für den belegten Schnitt zur Verfügung.

## Prüfung gegen direkte Gleichgewichte

Die 26 gespeicherten Vergleichszustände in tests/reference-v3.json wurden mit direkten pycalphad-Gleichgewichten berechnet. Die größte absolute Abweichung eines Phasenanteils beträgt bei diesem Stand 0,343 Prozentpunkte. Das prüft die numerische Näherung, nicht die experimentelle Gültigkeit der NIST-Modellparameter. Die Referenzgenerierung ist mit validate-models.py reproduzierbar.

Die unabhängige Liquidusprüfung verwendet 70 zusätzliche Zusammensetzungen (tests/liquidus-reference-*.json). Maximaler Betrag der Abweichung gegen direkte Gleichgewichte: Ag–Cu–Sn 1,240 K, Bi–Pb–Sn 0,461 K. Diese Stichprobe prüft die numerische Interpolation gegen dasselbe thermodynamische Modell, nicht gegen Messungen.

Die Gestaltung orientiert sich am Lehrweg über Randsysteme, Liquidusschnittlinien und Konodendreiecke, wie er auch in Burkhard Heines Lehrinhalten der Hochschule Aalen vertreten ist (https://www.hs-aalen.de/person/burkhard-heine/). Vertiefung: Hansen/Beiner, Heterogene Gleichgewichte, de Gruyter 1974. Es wurde keine öffentlich zugängliche interaktive Heine-Implementierung gefunden. Quellenabbildungen und private Unterrichts-PDFs werden nicht veröffentlicht.

Bei den ternären Literaturmarkierungen bedeutet E: L → α + β + γ, P: L + α + β → γ, U: L + α → β + γ. Der NIST-Tabelleneintrag zu 640,1 °C wird wegen widersprüchlicher Ag-Bilanz nicht als Zusammensetzungsziel übernommen. Die übrigen Markierungen sind als Literaturwerte von der Modellinterpolation unterschieden.

## Prüfen

    npm test

Für die Browserprüfung einen eigenständigen Playwright-Chromium verwenden:

    node tests/browser-check.cjs

WERKZEUGDECK_PLAYWRIGHT zeigt auf das vorhandene Playwright-Paket. Microsoft Edge wird nicht verwendet. Die Prüfung umfasst beide Prozentbasen, freie Schnitte, beide Reinstoffenden, Eutektikumsvergleich, Bildexport aller Diagrammarten, glatte Konturen, Ablesewerte, Gefügeskizzen, korrekte Elementsymbole sowie Desktop und Mobilansicht. Prüfdateien unter qa/ sind lokal und werden nicht veröffentlicht.

Nutzung als privates Lernprojekt. Quellen, Berechnungsgrenzen und Haftungshinweise stehen in der Anwendung.

## Spätere Desktop-Richtung

Eine gemeinsame Werkstoffkunde.exe soll den Legierungsatlas, den geplanten Aluminiumgefügerechner und geeignete weitere Werkstoffkunde-Module zusammenführen. Die aktuelle Ausbaustufe bleibt eine lokale Browseranwendung; es wird noch kein EXE-Paket erstellt. Online-Darstellung und spätere Desktop-Version sollen gemeinsame Datenformate und Diagrammkomponenten verwenden.


