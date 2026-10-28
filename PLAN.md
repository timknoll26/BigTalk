# Big Talk – Plan

Partyspiel für **ein** Handy: Challenge-Karte anzeigen, alle drücken gemeinsam auf Start und überbieten
sich 15 Sekunden lang durch Zurufen (ohne Eingaben). Danach muss der Höchstbieter liefern.

> Version 2 (Okt. 2026): Das ursprüngliche Eintippen jedes Gebots mit Timer-Reset wurde ersetzt.
> Die alte Mechanik ist als Idee für eine Online-Version in IDEEN.md festgehalten.

## Dateistruktur

```
index.html              Alle Bildschirme als <section class="screen"> – immer nur einer sichtbar
style.css               Gesamtes Design (Mobile-first, „Spieltisch“: grüner Filz, Papierkarten)
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

`round = { cardId, phase, timer, endsAt, remainingMs, proofState, bidderId, success, delta }`

Nach einem Neuladen läuft der Timer nicht ungefragt weiter: Die Restzeit wird zur Pause.
War die Zeit schon abgelaufen, geht es direkt zum Beweis.

## Ablauf (Phasen)

```
start ──► card ──(Start, 15 s)──► prove ──(Geschafft/Nicht)──► result ──► card (nächste Karte)
             └──── Überspringen (jederzeit, auch im Beweis) ────► card
```

- **start**: Logo, „Los geht's“, Kategorien, Spieler, Kurzregeln, Einstellungen, eigene Karten.
- **card**: Karte + Ring-Timer. Ring antippen = Start / Pause / Weiter. „Fertig geboten“ beendet früher,
  „Überspringen“ wirft die Karte weg.
- **prove**: Stempel „Beweis es!“ + Karte. Mit Spielern: Höchstbieter wählen.
  Optionaler Beweis-Timer mit Start-Button. Buttons „Geschafft“ / „Nicht geschafft“.
- **result**: Ergebnis, Punkteänderung, Punktestand, „Nächste Karte“.

Version 2 (nach erstem Feedback): Ablauf ohne Eingaben, Überspringen überall, neues Design → ENTSCHEIDUNGEN Nr. 24–28.

## Etappen

1. Plan (diese Datei), ENTSCHEIDUNGEN.md, LERNEN.md
2. Kern-Spielschleife ohne Spieler/Punkte
3. Spieler, Punkte, localStorage
4. Kategorien, eigene Karten, Einstellungen
5. PWA/Offline, Wake Lock, Design-Feinschliff
6. GitHub Pages + Live-Test
