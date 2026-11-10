# Downloadbereich pflegen

Die Adresse `/downloads/` ist über die gemeinsame Navigation der Startseite, Fachgebiete und Theorieseiten erreichbar. Der Bereich startet bewusst leer. Es gibt keine automatische Übernahme von Tools oder vorgeplante Offlinepakete. Nur ausdrücklich ausgewählte Inhalte veröffentlichen.

## Inhalt ergänzen

Kategorien und Einträge stehen in `content/downloads.json`. Weitere Kategorien können ergänzt werden. Eine Kategorie hat `id`, `title` und `description`. Ein Eintrag hat `id`, `category`, `title`, `description` und `status` (`planned` oder `available`). Einträge in Vorbereitung haben keine Datei und keinen Downloadlink. Eine optionale `tool`-ID dient nur der internen Zuordnung; sie erzeugt keinen Paket- oder Toollink.

Eine Datei unter `downloads/files/` ablegen und explizit in einem Eintrag angeben:

```json
{
  "id": "einstieg-1-0",
  "category": "anleitungen",
  "title": "Einstieg",
  "description": "Eine kurze Bedienhilfe.",
  "status": "available",
  "file": "einstieg-1.0.pdf",
  "version": "1.0",
  "updated": "2026-11-10",
  "format": "PDF",
  "requirements": "PDF-Betrachter",
  "license": "Hier die tatsächlichen Nutzungsrechte angeben.",
  "instructions": "Datei herunterladen und öffnen."
}
```

Der Build kopiert ausschließlich aufgeführte Dateien nach `/downloads/dateien/<id>/<dateiname>`. Er prüft Pflichtangaben, eindeutige IDs, Kategorien, sichere Pfade, Dateivorhandensein und Dateigröße (1 Byte bis 24 MiB). Größe und SHA-256 werden aus der tatsächlichen Datei berechnet. Große Pakete brauchen vor Veröffentlichung eine geeignete separate Bereitstellung; kein stilles Überschreiten des Limits. Veröffentlichte Dateinamen und IDs zur Versionierung beibehalten oder für neue Versionen neue Namen vergeben.

## Freigabe

Vor Veröffentlichung Inhalt, Nutzungsrechte, Versionsangabe und Installationshinweise prüfen. Offlinepakete auf einem frischen System ohne Internet testen; externe Rechenbibliotheken müssen mitgeliefert oder als Einschränkung dokumentiert sein. Quellcodearchive sind keine geprüften Offlinepakete. Anleitungen und Theorie bei fachlichen Änderungen aktuell halten. Keine privaten Messdateien oder Zugangsdaten aufnehmen.

`npm test`, `npm run build` und `node scripts/check-design.cjs` ausführen. Downloadseite auf Desktop und Mobilgeräten prüfen; bei einem echten Paket Download, Dateigröße, Prüfsumme und Öffnen/Installation kontrollieren. Der leere Bereich zeigt ausdrücklich, dass noch keine Dateien veröffentlicht sind.
