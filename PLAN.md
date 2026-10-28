# Big Talk – Plan

Partyspiel für **ein** Handy: Challenge-Karte anzeigen, Spieler überbieten sich durch Zurufen,
wer das Handy hält, tippt jedes Gebot ein. Nach 15 s ohne neues Gebot muss der Höchstbieter liefern.

## Dateistruktur

```
index.html              Alle Bildschirme als <section class="screen"> – immer nur einer sichtbar
style.css               Gesamtes Design (Mobile-first, dunkles Party-Theme)
manifest.webmanifest    PWA-Manifest (Name, Farben, Icons → Homescreen)
sw.js                   Service Worker (Offline-Cache)
icons/                  App-Icons (SVG + PNG 192/512 + Apple-Touch-Icon 180)
js/
  app.js        Einstieg: Zustand, Bildschirmwechsel, Event-Handler, Spielablauf
  cards.js      Kategorien + ~30 Startkarten (reine Daten)
  deck.js       Deck mischen / ziehen ohne Wiederholung
  scoring.js    Punkteregeln (an einer Stelle änderbar)
  storage.js    localStorage lesen/schreiben (fehlertolerant)
  timer.js      Countdown auf Basis von Zeitstempeln (überlebt Tab-Wechsel)
  sound.js      Töne über die Web Audio API (keine Dateien)
  feedback.js   Vibration
  wakelock.js   Bildschirm wach halten (Wake Lock API + Fallback)
```

## Zustand (in `app.js`, gespeichert in localStorage)

| Schlüssel            | Inhalt                                                           |
|----------------------|------------------------------------------------------------------|
| `bigtalk.settings`   | `{ timerSeconds, sound, vibration, categories: [...] }`          |
| `bigtalk.players`    | `[{ id, name, score }]`                                          |
| `bigtalk.customCards`| eigene Karten, gleiche Struktur wie Startkarten                   |
| `bigtalk.game`       | `{ deck: [ids], phase, round }` – laufende Runde                 |

`round = { cardId, bids: [Zahlen], bidderId, result }`

Laufende Timer werden **nicht** als „läuft“ gespeichert: Nach einem Neuladen ist die Runde
pausiert und wird mit einem Tipp fortgesetzt (sonst könnte der Timer abgelaufen sein,
während niemand hinschaut).

## Ablauf (Phasen)

```
start ──► bid ──(Timer 0)──► prove ──(Geschafft/Nicht)──► result ──► bid (nächste Karte)
```

- **start**: Logo, „Los geht's“, Spieler, Kategorien, Kurzregeln, Einstellungen, eigene Karten.
- **bid**: Karte + Höchstgebot + Timer. Erstes „+“ setzt den Startwert, jedes weitere +Mindestschritt.
  „+5“ für große Sprünge, Tippen auf die Zahl für direkte Eingabe, Rückgängig nimmt das letzte
  Gebot zurück. Vor dem ersten Gebot: „Karte überspringen“.
- **prove**: Vollbild „Beweis es!“ + finales Gebot. Mit Spielern: Höchstbieter wählen.
  Optionaler Beweis-Timer mit Start-Button. Buttons „Geschafft“ / „Nicht geschafft“.
- **result**: Ergebnis, Punkteänderung, Punktestand, „Nächste Karte“.

## Etappen

1. Plan (diese Datei), ENTSCHEIDUNGEN.md, LERNEN.md
2. Kern-Spielschleife ohne Spieler/Punkte
3. Spieler, Punkte, localStorage
4. Kategorien, eigene Karten, Einstellungen
5. PWA/Offline, Wake Lock, Design-Feinschliff
6. GitHub Pages + Live-Test
