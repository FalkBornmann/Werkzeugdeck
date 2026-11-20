# Legierungsatlas

Interaktiver Phasenatlas für Werkzeugdeck mit frei wählbaren Gehaltsschnitten.

## Metallmodelle

Ag–Cu–Sn, Bi–Pb–Sn, Ag–Bi–Sn und Bi–Cu–Sn sowie Sn–Bi, Sn–Cu, Ag–Cu, Ag–Sn, Pb–Sn und Bi–Pb werden aus der NIST-Lotdatenbank (Stand 2017-08-04) berechnet. Beide Reinstoffenden sind enthalten. Der Browser bestimmt für jede frei gewählte Zusammensetzung die Phasenanteile anhand der unteren konvexen Gibbs-Energie-Hülle. Die Bilanz erfolgt im vollständigen Zusammensetzungsraum.

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

## Salzmodell aus Isothermen

NaCl–KCl–AlCl₃ wird als geometrisches Übersichtsmodell aus Abb. 21 und Tabelle 6 von Robelin, Chartrand und Pelton (2004), doi:10.1016/j.jct.2004.04.011, rekonstruiert. Es verwendet 343 numerische Isothermenstützstellen, Verbindungen und Referenzeutektika. Die Original-PDF und Quellenabbildungen werden nicht mitveröffentlicht.

Die Quellisothermen werden geometrisch beruhigt; formtreue Profile entlang fester NaCl/KCl-Verhältnisse verbinden sie zur Liquidusfläche. Bei zweimal geschnittenen gleichen Isothermen wird ein sanftes Tal innerhalb des benachbarten 25-K-Stützabstands angenähert. Diese zusätzliche Talform ist eine Annahme. Die gezeichneten Isothermen bleiben Literaturstützlinien, keine neuen Messwerte.

Die Projektion allein bestimmt keine eindeutigen Mengen. Die zusätzliche Regel wählt den größten geometrisch zulässigen Schmelzanteil, dessen Zerlegung mit festen NaCl-, KCl-, NaAlCl₄-, KAlCl₄- und AlCl₃-Bilanzpunkten den Gesamtgehalt ergibt. Vorhandene NaCl/KCl-Festanteile werden näherungsweise mit dem binären Überschuss-Gibbsmodell aus Gleichung (13) der Veröffentlichung in einen oder zwei Mischkristalle aufgeteilt. Die Komponenten- und Massenbilanz bleibt erfüllt; der gesamte Zustand ist keine thermodynamische Gibbs-Minimierung. Felder unterdrücken Spuren unter 0,3 % und beruhigen Einzelspalten innerhalb derselben Schmelzklasse. Die Mengenwerte bleiben davon getrennt.

Abkühlkurven verwenden ein normiertes Wärmeabfuhrmaß: normierter sensibler Anteil plus 0,6 mal Schmelzanteil. Die Annahme dient der Darstellung von Knicken und Halten, nicht der Vorhersage von Sekunden oder kJ/mol. Volumenanteile und reale Gefügestruktur sind nicht bestimmt.

Der durch die erfassten Isothermen nicht ausreichend belegte Bereich oberhalb 74 mol-% AlCl₃ bleibt grau und liefert keine Mengenprognose. Gas und Flüssig–Flüssig-Entmischung fehlen; die Zustände beschreiben kondensierte Modellphasen. Ein flüssiger Modellzustand schließt Verdampfung nicht aus.

Referenzen: E₁ 132,1 °C bei x=(0,364 / 0,138 / 0,498); E₂ 91,4 °C bei (0,255 / 0,142 / 0,603); E₃ 241,47 °C bei (0,002 / 0,512 / 0,486). Quasibinär NaAlCl₄–KAlCl₄: E 133,2 °C bei x(KAlCl₄)=0,278; Endglieder 156,7 / 257,3 °C. Der Referenzschnitt bei 40 mol-% AlCl₃ ist außerdem in ORNL/SPR-2021/2102, Abb. 6 dokumentiert.

Reproduktion mit einer eigenen Kopie der Veröffentlichung:

    python build-salt-diagram.py path/to/Robelin2004.pdf

## Glatte Anschmelzgrenzen und Felder

Für die Metallmodelle werden zusätzlich direkte Flüssigauftretens-Gleichgewichte eingegrenzt. Ternäre Anschmelzäste werden nach ihrem festen Phasenbestand getrennt interpoliert; dadurch werden reale Reaktionssprünge nicht zu falschen Rampen verschmiert. Der lokale numerische Temperaturbereich prüft die Astzuordnung. Übrige Feldgrenzen werden mit einer Krümmungsstrafe gemeinsam geglättet. Liquidus, Anschmelzgrenze und Verzweigungsendpunkte haben Vorrang. Die benachbarten Flächen benutzen identische Randkurven.

    node solidus-seeds.mjs
    python build-solidus.py sac
    python build-solidus-branches.py sac
    python build-solidus.py pbsnbi
    python build-solidus-branches.py pbsnbi
    python build-solidus.py bisn
    python build-solidus.py cusn

96 unabhängige Direktrechnungen prüfen die tatsächliche Browser-Anschmelzdarstellung. Maximale Abweichungen dieser Stichprobe: Ag–Cu–Sn 5,875 K, Bi–Pb–Sn 0,872 K, Sn–Bi 0,002 K und Sn–Cu 0,389 K. Das prüft eine numerische Näherung gegen dasselbe Stoffmodell, keine experimentelle Gültigkeit. Reproduktion: für jedes System python validate-solidus.py SYSTEM, anschließend node validate-solidus-display.mjs.

## Feste Anker im Gehaltsdreieck

Ein oder zwei Anker A₁/A₂ können auf Literaturziele oder auf die aktuelle Zusammensetzung von S₁/S₂ gesetzt werden. Ein Anker erlaubt das Drehen der Schnittgeraden mit Winkelsteuerung oder durch Ziehen von S₁/S₂; zwei Anker fixieren die Gerade. Die Endpunkte sind die Randintersektionen mit dem Dreieck. X-Punkte bleiben frei auf dem Schnitt verschiebbar. Bindungen werden bei einem Systemwechsel gelöst und beim Basiswechsel physikalisch erhalten. Die rote Liquidus-Schnittlinie wird auf die blaue 3D-Schnittebene projiziert und gemeinsam aktualisiert.

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
## Erweiterte Systembibliothek

Die sechs neuen Systeme verwenden dieselbe öffentlich verfügbare NIST-Datenbank. Ag–Cu, Ag–Sn, Pb–Sn und Bi–Pb besitzen bewertete binäre Beschreibungen. Ag–Bi–Sn und Bi–Cu–Sn sind laut NIST aus binären Beschreibungen extrapoliert; ihre ternäre Vorhersage ist nicht gleichbedeutend mit einer experimentellen Vollbewertung. Die gespeicherten NIST-Marker bleiben von der Rechnung getrennt. Beispielsweise führt die verwendete Beschreibung für Pb–Sn 182,2 °C als eutektische Referenz an.

| System | Nutzen für Anwendung und Lehre |
| --- | --- |
| Ag–Cu | Hartlot; Eutektikum und zwei feste kfz-Mischkristalle |
| Ag–Sn | Bleifreies Lot-Grundsystem, Ag₃Sn und Peritektika |
| Pb–Sn | Klassischer eutektischer Weichlot-Vergleich mit begrenzter Löslichkeit |
| Bi–Pb | Flüssigmetall-Kühlmittel; ε-Pb und Peritektikum |
| Ag–Bi–Sn | Bi-haltiges Niedertemperaturlot mit Ag₃Sn |
| Bi–Cu–Sn | Verbindung von Sn–Bi und Sn–Cu mit Cu–Sn-Verbindungen |

Quellen der technischen Einordnung: [NIST-Lotdatenbank](https://www.metallurgy.nist.gov/phase/solder/solder.html), [Johnson Matthey · Ag–Cu-Hartlot](https://matthey.com/documents/161599/3919687/Argo-braze%2B72V%2Btechnical%2Bdatasheet%2Bfinal.pdf/68749e45-b12d-8174-4d5d-2ad0dba2f155), [NIST · bleifreie Lote](https://www.nist.gov/programs-projects/lead-free-solder) und [OECD/NEA · Flüssigblei und Blei-Bismut](https://www.oecd.org/content/dam/oecd/en/publications/reports/2015/11/handbook-on-lead-bismuth-eutectic-alloy-and-lead-properties-materials-compatibility-thermalhydraulics-and-technologies_44193663/42dcd531-en.pdf).

Reproduktion der neuen Systeme:

    python build-equilibria.py --system agcu --density 2200
    python build-equilibria.py --system agsn --density 2200
    python build-equilibria.py --system pbsn --density 2200
    python build-equilibria.py --system bipb --density 2200
    python build-equilibria.py --system agbisn --density 1600 --grid 60 --refine
    python build-equilibria.py --system bicusn --density 1600 --grid 60 --refine
    python split-hulls.py agbisn bicusn
    node surface-seeds.mjs agbisn bicusn
    node solidus-seeds.mjs agcu agsn pbsn bipb agbisn bicusn

Danach je ternärem System build-liquidus.py, je System build-solidus.py und zusätzlich für die ternären Systeme build-solidus-branches.py ausführen. validate-additions.py erstellt 125 unabhängige Gleichgewichtszustände für die Mengenprüfung. validate-liquidus.py und validate-solidus.py erzeugen unabhängige Temperaturprüfpunkte; validate-solidus-display.mjs prüft die tatsächlich verwendete Anschmelzdarstellung.

Die nächste Ausbaustufe ist in der sichtbaren, aufklappbaren Auswahlhilfe recherchiert: Al–Si, Cu–Ni, Al–Cu, Al–Mg–Si, Al–Cu–Si, Cu–Zn, Fe–C/Fe–Fe₃C und NaCl–KCl–MgCl₂. systems.js enthält Nutzen, benötigte Daten, Priorität und Quellen. Diese Kandidaten sind noch keine aktivierbaren Modelle. Isothermen erlauben einen geometrischen Einstieg, bestimmen aber weder alle Phasenmengen noch Abkühlzeiten oder die reale Morphologie.

Die großen neuen ternären Pakete sind verlustfrei nach Temperaturzuständen aufgeteilt. Der Modellindex nennt die komprimierten Teile; nur das gewählte System wird geladen und lokal zusammengesetzt. Die monolithischen Generator-Zwischendateien sind nicht Teil der Veröffentlichung.

### Prüfung der sechs Ergänzungen

125 separat gelöste Gleichgewichtszustände prüfen die Phasenanteile; maximale absolute Abweichung der diskreten Hüllen in dieser Stichprobe: 0,362 Prozentpunkte. Komponenten- und Massenbilanzen werden zusätzlich geprüft. Für jede neue Anschmelzdarstellung sind 24 unabhängige Zusammensetzungen hinterlegt (144 insgesamt): maximale Abweichung 1,420 K. Je neuem ternärem Liquidusmodell prüfen 34 unabhängige Zusammensetzungen die Darstellung (68 insgesamt): Ag–Bi–Sn maximal 1,190 K, Bi–Cu–Sn maximal 3,842 K. Die Fehlergrenzen gelten für diese Stichproben gegenüber derselben NIST-Gibbs-Beschreibung und sind keine zugesicherte experimentelle Genauigkeit.

Die neuen ternären Modelle enthalten systematisch verdichtete Gleichgewichtsstützstellen entlang aller verdünnten Ränder. Ag–Bi–Sn verwendet 3199 direkte Liquidusstützstellen; Bi–Cu–Sn verwendet 6889, einschließlich eines dichteren allgemeinen Dreiecksrasters und zusätzlicher Bi–Sn-Randprofile. Randkoordinaten, die Qhull durch Rundung wenige ulps außerhalb der Interpolationshülle einordnet, werden als infinitesimaler innerer Grenzwert derselben Fläche ausgewertet. Fehlende innere Daten werden nicht mit beliebigen Temperaturen aufgefüllt.
