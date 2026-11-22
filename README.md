# Gefügerechner für Aluminium
Werkzeugdeck / Werkstofftechnik / Simulation. Öffentliche Quellen: https://github.com/Werkzeugdeck/aluminiumgefuegerechner
Browseranwendung ohne externe Laufzeitbibliotheken. Kinetik ist ein **unkalibriertes Lehrmodell**, keine Fertigungs- oder Festigkeitsprognose.

## Wiederverwendung aus dem Stahlrechner
Wärmeleitung für den Viertel-Rechteckquerschnitt und radialen Rundstab in thermal.js (unveränderte Infrastruktur), lokaler Modul-Worker, gemeinsame Canvas/SVG-Technik sowie Werkzeugdeck-Design, Zeitdock und Exportmenü. Stahlkinetik, ZTU-Flächen, Härtemischung und Austenitisierung wurden nicht übernommen.
Die Aluminiumkinetik folgt einem eigenen, konservativen Vier-Reservoir-Modell. Prozentwerte beschreiben das normierte aushärtungswirksame Legierungsreservoir, keine Volumen- oder Phasenanteile des Bauteils. Es gibt keine Partikelgrößen-/Kornwachstumsprognose.

## Physik und Grenzen
EN AW-6082. Konstante Wärmeleitfähigkeit 172 W/(m K), Dichte 2710 kg/m³, Wärmekapazität 900 J/(kg K). k und gerundete Dichte nach Hydro, cp als Lehrnäherung. 12 × 12 Viertelquerschnittszellen oder 12 Ringzellen. Implizite FV-Wärmeleitung; adaptive Schritte bei Abschrecken; keine Strahlung, Schmelze, Umwandlungswärme oder mechanische Kopplung.
Endliche Auflösung, quench-sensitive grobe Ausscheidung, natürliche Clusterbildung sowie temperaturabhängige feine Bildung und Vergröberung sind heuristisch. Alle Gleichungen stehen sichtbar in der aufklappbaren Theorie. Normierter Aushärtungsindex statt absoluter HV-/Rm-Prognose, keine T6-Zertifizierung.

## Separate Literaturreferenz
He et al., Metals 2019, 9(2), 173, https://doi.org/10.3390/met9020173 (CC BY 4.0).
Abschnitt 3.1.1 nennt 83.07, 132.32, 116.87, 102.23 HV bei 0, 8, 18, 96 h und 175 °C. Nur diese Textwerte werden verwendet. Quelle: 545 °C / 50 min, Wasserabschrecken, 5-mm-Proben, HV 0.5 / 15 s, sechs Eindrücke.
Verbindung ist lineare Interpolation, kein Kinetikfit. Referenzdaten kalibrieren oder validieren die freie Prozesssimulation nicht. Allgemeine Werkstoffmechanismen und einzelne Interpretationen der Publikation sind nicht ungeprüft in die Modellgleichungen übernommen.
Keine unabhängige experimentelle Validierung vorhanden.

## Bedienung und Daten
Prozessvorlagen und frei editierbare Schritte (0–550 °C, 1 s bis insgesamt 14 Tage, höchstens 16 Schritte), Geometrie, Ausgangszustand, synchronisierte Zeit und Ortsregler, vergrößerte Diagramme, vier vollständige Prozessvergleiche. Neu eingestellte Parameter entwerten das alte Ergebnis.
PNG und echte SVG sämtlicher acht Grafiken verwenden dieselbe Zeichenroutine. Video läuft über das gemeinsame lokale Exportmenü, ermittelt das Format zur Laufzeit und enthält Zeit/Modellhinweis. CSV enthält alle gespeicherten Zeiten/Zellen; JSON im Format 2 alle Prozessparameter, Vergleichsnamen und Darstellungsoptionen. Import validiert Parameter und berechnet aktuellen Prozess sowie gespeicherte Vergleiche mit dem aktuellen Modell neu. Alte Format-1-Dateien bleiben lesbar. Keine Datenspeicherung oder Messdatenübertragung.

## Prüfen
Node >=20: node --test tests/*.test.mjs
Browser: über HTTP öffnen (Module/Worker), tests/browser-check.cjs mit WERKZEUGDECK_PLAYWRIGHT und optional EIS_BROWSER auf **eigenständiges Chromium**, niemals Microsoft Edge.
Tests prüfen Bilanzen, thermische Schranken, Verfeinerung, Zeitschrittsensitivität, Reservoirgrenzen und Vektorexporte; das ist numerische Prüfung, keine Werkstoffvalidierung.

## Veröffentlichung
Eigenes Organisationsrepository Werkzeugdeck/aluminiumgefuegerechner, feste Revision im Website-Katalog. Fachtheorie und Gestaltung im Website-Repository verknüpfen. Keine automatischen Offlinepakete oder Downloads.

## Ortsprofile und vollständige Vergleiche
Querschnitt und Profil sind mit Maus, Touch und Pfeiltasten bedienbar. Zellmitten in Millimetern, gespiegelte Schnittlinien und Kreuzmarker stimmen mit Ablesetext und Ausscheidungsansicht überein. Die Farbwahl steuert tatsächlich Temperatur beziehungsweise Index. Profile zeigen Temperatur, Index oder einzelne Reservoiranteile; zwischen Zellmittelwerten wird nur für die Linie verbunden.
Bis zu vier benannte vollständige Prozesse bleiben unabhängig vom aktuellen Entwurf gespeichert, einschließlich aller Parameter und Ergebnisse. Anzeigen stellt den Prozess ohne erneute Rechnung wieder her. Unterschiede in Geometrie, Ausgangszustand und Schritten bleiben einsehbar. Vergleichskurven bieten gleiche reale Prozesszeit oder gleichen relativen Fortschritt. Nach Prozessende keine Kurvenverlängerung. Zeitmarkierungswerte werden nur zwischen vorhandenen Frames linear interpoliert; gleiche relative Orte liegen bei anderen Geometrien an anderen Millimeterkoordinaten.
Alle acht Grafiken inklusive Profil und Vergleich bieten PNG und echte SVG; berechnete Zeitverläufe außerdem Video. Separate Vergleichs-CSV enthält sämtliche gespeicherten Zeitpunkte aller Kurven für den gewählten Auswerteort und benennt reale Zeit und Fortschritt. Projektformat 2 enthält ausschließlich Parameter statt ungeprüfter Ergebnisobjekte und berechnet Verläufe beim Import lokal neu. Die Kinetik ist unverändert und bleibt unkalibriert.
