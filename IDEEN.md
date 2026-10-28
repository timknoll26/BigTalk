# Ideen für später

Sammlung von Ideen, die **noch nicht umgesetzt** werden. Erst einmal zählt die Grundidee:
Karte lesen → Start → 15 Sekunden laut überbieten → beweisen.

## Online-Version mit echtem Bieten
- Jeder spielt am eigenen Handy, alle sind in einem gemeinsamen Raum (Code oder QR-Code zum Beitreten).
- Gebote werden **eingetippt** statt gerufen: Jeder sieht das aktuelle Höchstgebot live und kann überbieten.
  Hier passt die ursprüngliche Mechanik wieder: Jedes neue Gebot setzt den Timer zurück, Mindestschritt pro Karte.
- Der Höchstbieter steht automatisch fest, niemand muss ihn auswählen.
- Beweis per Videoanruf oder vor Ort. Die anderen stimmen per Knopf ab: geschafft oder nicht.
- Braucht einen Server (z. B. WebSockets) – das wäre der erste Schritt weg von „nur ein Handy, kein Backend“.

## Spielmodi
Jeder Modus bringt ein eigenes Kartendeck und eventuell eigene Regeln mit.
- **Party:** Lockere Challenges, Trinkspiel-Variante optional, eher alberne Aufgaben.
- **Schule:** Wissenskarten passend zu Fächern (Mathe, Erdkunde, Englisch-Vokabeln), ohne Körpereinsatz,
  im Klassenzimmer machbar. Eventuell Teams statt Einzelspieler.
- **Sport:** Körper- und Geschick-Challenges fürs Training oder den Sportplatz, mit Zeitmessung.

## Kleinere Ideen
- Höchstgebot optional festhalten (z. B. „12 Liegestütze“), damit beim Beweis niemand die Zahl vergisst.
- Punkte nach Höhe des Gebots oder nach Schwierigkeit der Karte (Regeln stecken schon in `js/scoring.js`).
- Wischen zum Überspringen einer Karte.
- Karten-Packs teilen: eigene Karten als Link oder QR-Code an Freunde schicken.
- Statistik: Wer hat die meisten Beweise geschafft, welche Karte wird am häufigsten übersprungen?
- Team-Modus: zwei Teams bieten gegeneinander, das Team bestimmt, wer liefert.
