# Entscheidungen

Kurzprotokoll: **was** entschieden wurde, **warum**, und welche Alternative verworfen wurde.

## Etappe 1 – Grundaufbau

**1. Eine HTML-Seite mit mehreren Bildschirmen statt mehrerer HTML-Seiten**
- Gewählt: Alle Bildschirme stehen in `index.html`, JavaScript blendet immer genau einen ein.
- Warum: Kein Neuladen zwischen Phasen → Timer, Töne und Wake Lock laufen ununterbrochen; sofortige Wechsel.
- Verworfen: Eigene Seiten (`start.html`, `spiel.html` …) – jeder Wechsel lädt neu, Zustand müsste ständig
  übergeben werden, Wake Lock ginge verloren.

**2. ES-Module (`<script type="module">`) statt klassischer Skripte**
- Gewählt: Jede JS-Datei exportiert/importiert, was sie braucht.
- Warum: Klare Abhängigkeiten, keine globalen Variablen, läuft auf GitHub Pages und localhost ohne Build-Schritt.
- Verworfen: Mehrere `<script>`-Tags mit globalen Variablen – Reihenfolge fehleranfällig, Namenskollisionen.
- Nachteil: Funktioniert nicht per Doppelklick (`file://`), braucht einen Server. Für Tests sowieso nötig.

**3. Timer über Zeitstempel statt Herunterzählen mit `setInterval`**
- Gewählt: Gespeichert wird der Zeitpunkt, an dem der Timer abläuft (`Date.now() + 15000`); die Anzeige
  rechnet alle 100 ms die Restzeit aus.
- Warum: `setInterval` wird im Hintergrund oder bei Last gebremst und „verliert“ Zeit. Mit Zeitstempel stimmt
  die Restzeit immer.
- Verworfen: Zähler `sekunden--` jede Sekunde – driftet und stoppt im Hintergrund-Tab.

**4. Nach Neuladen: Runde pausiert statt Timer weiterlaufen lassen**
- Gewählt: Laufende Runde (Karte, Gebote) bleibt erhalten, der Timer steht aber auf Pause und startet beim
  nächsten Tipp neu mit voller Zeit.
- Warum: Lädt jemand versehentlich neu, soll die Runde nicht verloren sein – aber auch nicht unbemerkt ablaufen.
- Verworfen: (a) Restzeit weiterlaufen lassen – ist meist schon abgelaufen, „Beweis es!“ käme aus dem Nichts.
  (b) Runde verwerfen – Gebote weg, Ärger am Tisch.

**5. Bieten: erstes „+“ = Startwert, dann + Mindestschritt; zusätzlich „+5“ und Direkteingabe**
- Warum: Auf Partys springen Gebote oft („Dreißig!“). Nur „+1“ hieße 20-mal tippen.
- Verworfen: Nur Zifferneingabe – mit einer Hand und Lärm zu langsam; nur Plus – zu langsam bei Sprüngen.

**6. Rückgängig ändert den Timer nicht (außer beim letzten Gebot)**
- Gewählt: Rückgängig entfernt nur das letzte Gebot. Ist danach kein Gebot mehr übrig, stoppt der Timer.
- Warum: Ein Fehltipp hat den Timer schon zurückgesetzt; ein Rückgängig soll niemandem extra Zeit schenken.
  Bei 0 Geboten ist Rückgängig ausgegraut (Randfall „Rückgängig bei Gebot 0“).
- Verworfen: Timer bei Rückgängig neu starten – verlängert Runden künstlich.

**7. Ein Beweis-Bildschirm statt drei (Zeit abgelaufen → Bieter → Beweis)**
- Gewählt: „Beweis es!“, Bieter-Auswahl, Beweis-Timer und Ergebnis-Buttons auf einem Bildschirm, nacheinander
  eingeblendet.
- Warum: Weniger Tippen, weniger Wechsel. „Geschafft“/„Nicht geschafft“ sind sofort da, wenn der Bieter feststeht –
  auch vor Ablauf des Beweis-Timers (wer 20 Hauptstädte in 40 s schafft, ist fertig).
- Verworfen: Je ein eigener Bildschirm – mehr Klicks, nichts gewonnen.

**8. Keine Webfonts, Systemschrift in Schwer (900)**
- Warum: Offline sofort verfügbar, keine fremden Server, kein Flackern beim Laden. Charakter bekommt das Logo
  über Schräglage, Verlauf und harte Schatten.
- Verworfen: Google Fonts – externe Anfrage, Offline-Cache komplizierter, Datenschutz.

**9. Darstellung: „Zustand ändern → render()“ statt DOM direkt in jedem Handler zu ändern**
- Gewählt: Handler ändern nur das Zustandsobjekt und rufen dann `render()` auf, das den sichtbaren
  Bildschirm aus dem Zustand neu befüllt.
- Warum: Eine Stelle für die Anzeige, weniger „vergessene“ Aktualisierungen. Das ist die Grundidee hinter
  Frameworks wie React – hier von Hand und klein.
- Verworfen: Jeder Handler ändert passende DOM-Elemente selbst – schnell unübersichtlich.

## Etappe 3 – Spieler, Punkte, Speichern

**10. Höchstbieter wird erst nach Ablauf gewählt, nicht bei jedem Gebot**
- Gewählt: Nach „Beweis es!“ tippt man einmal auf den Namen.
- Warum: Bei Lärm und schnellen Geboten ist „+“ das Einzige, was man zuverlässig schafft. Namen pro Gebot wären zu langsam.
- Verworfen: Für jedes Gebot den Bieter antippen – genauer, aber auf einer Party unbedienbar.

**11. Punkteregeln als Funktionen in `scoring.js`**
- Gewählt: `SCORING_RULES = { success: () => 1, fail: () => -1 }`. Die Funktionen bekommen Gebot und Karte mit.
- Warum: Spätere Regeln („Punkte = Höhe des Gebots“, „kein Abzug“) sind eine Zeile, ohne `app.js` anzufassen.
- Verworfen: Feste Zahlen `+1/−1` direkt in `app.js` – schnell, aber verstreut und schwer änderbar.

**12. Speichern bei jedem `render()`**
- Gewählt: `render()` ruft zuerst `saveGame()` auf. Spieler werden bei jeder Punkteänderung gespeichert.
- Warum: Jede Zustandsänderung endet in `render()`. So kann kein Speichern vergessen werden. Die Datenmenge ist winzig.
- Verworfen: An jeder Stelle einzeln speichern – fehleranfällig. Speichern im Timer-Takt – unnötig oft.

**13. „Ergebnis ändern“ und „Ohne Wertung“**
- Warum: Ein falscher Tipp auf „Geschafft“ passiert im Trubel. Ein Rückweg, der die Punkte zurückbucht, ist billiger als Streit.
  „Ohne Wertung“ erlaubt Runden, in denen z. B. jemand mitspielt, der nicht in der Liste steht.

**14. Eigene Bestätigungs-Dialoge statt `window.confirm()`**
- Warum: Passen zum Design, große Buttons. `confirm()` sieht auf jedem Handy anders aus und ist winzig.
