# Big Talk verstehen

Hier steht für jede Etappe, was gebaut wurde und welche Ideen dahinterstecken.

## So startest du die Seite lokal

ES-Module funktionieren nicht per Doppelklick auf `index.html` (`file://`). Du brauchst einen kleinen Webserver:

```
cd C:\Users\timkn\Projects\BigTalk
python -m http.server 8000
```

Dann im Browser `http://localhost:8000` öffnen. In Chrome mit **F12 → Gerätesymbol** (Strg+Umschalt+M)
siehst du die Seite in Handygröße.

---

## Etappe 1 – Plan

**Was:** Noch kein Code, nur der Bauplan (`PLAN.md`) und die Entscheidungen (`ENTSCHEIDUNGEN.md`).

**Konzepte:**
- **HTML, CSS, JavaScript:** HTML ist der Inhalt (Überschriften, Buttons), CSS das Aussehen (Farben, Größen),
  JavaScript das Verhalten (was passiert beim Tippen).
- **Single Page App:** Es gibt nur eine HTML-Seite. Statt neue Seiten zu laden, blendet JavaScript Bereiche
  ein und aus. Dadurch bleiben Timer und Spielstand im Speicher.
- **Module:** Jede JS-Datei hat eine Aufgabe (`cards.js` = Daten, `timer.js` = Zeit …). Mit `export` gibt eine
  Datei etwas frei, mit `import` holt sich eine andere Datei das.
- **Zustand (State):** Alles, was das Spiel „weiß“ (welche Karte, welches Gebot, welche Phase), steht in einem
  JavaScript-Objekt. Die Anzeige wird daraus berechnet. Ändert sich der Zustand, wird neu gezeichnet.

---

## Etappe 2 – Kern-Spielschleife

**Was:** Karte ziehen → bieten → Timer → „Beweis es!“ → Geschafft/Nicht geschafft → nächste Karte.

**Wo steht was?**
- `index.html`: Jeder Bildschirm ist eine `<section class="screen">`. Nur die mit Klasse `active` ist sichtbar.
- `js/app.js`: Der `state` (Zustand) und alle Aktionen (`raise`, `undo`, `onBidTimeUp`, `finishRound` …).
- `js/deck.js`, `js/timer.js`, `js/sound.js`, `js/feedback.js`: kleine Helfer mit je einer Aufgabe.

**Konzepte:**
- **DOM (Document Object Model):** Der Browser macht aus dem HTML einen Baum von Objekten. Mit
  `document.getElementById('bid-value')` holt JavaScript sich ein Element und ändert z. B. `textContent`.
  In `app.js` ist `$` eine Abkürzung dafür.
- **Events:** `button.addEventListener('click', raise)` heißt: „Wenn jemand tippt, rufe `raise` auf.“
  Alle Verknüpfungen stehen gesammelt in `bindEvents()`.
- **CSS-Klassen als Schalter:** JavaScript setzt nur Klassen (`is-urgent`, `is-waiting`), das Aussehen
  steht in `style.css`. `classList.toggle('is-urgent', bedingung)` schaltet die Klasse an oder aus.
- **Timer mit Zeitstempel:** `Countdown` merkt sich *wann* die Zeit abläuft (`endsAt`) und rechnet alle 100 ms
  `endsAt - Date.now()` aus. `setInterval(fn, 100)` ruft `fn` alle 100 ms auf, `clearInterval` beendet das.
- **Mischen (Fisher-Yates):** `deck.js` mischt die Karten-IDs einmal. Gezogen wird von vorne. Erst wenn die Liste
  leer ist, wird neu gemischt. So kommt keine Karte doppelt, bevor alle dran waren.
- **Web Audio API:** `sound.js` erzeugt Töne mit einem *Oszillator* (Tonerzeuger mit Frequenz in Hertz) und
  einem *Gain* (Lautstärkeregler). Browser erlauben Ton erst nach dem ersten Tippen, daher `unlockAudio()`.
- **`<dialog>`:** Eingebautes HTML-Element für Pop-ups. `showModal()` öffnet es und sperrt den Rest der Seite.
- **Layout ohne Springen:** „Karte überspringen“ wird nach dem ersten Gebot nur *unsichtbar*
  (`visibility: hidden`), nicht entfernt. Sonst würde der Plus-Button nach oben rutschen, und der nächste
  schnelle Tipp ginge daneben. Diesen Fehler hat der Test in Etappe 2 gefunden.

**Werkzeug:** `tools/handy-vorschau.html` zeigt das Spiel in Handygröße (390×844) im normalen Browserfenster.

---

## Etappe 3 – Spieler, Punkte, localStorage

**Was:** Optional Spieler anlegen, Höchstbieter nach Ablauf wählen, ±1 Punkt, Rangliste, Zurücksetzen mit
Sicherheitsabfrage. Alles bleibt nach dem Neuladen erhalten.

**Konzepte:**
- **localStorage:** Ein kleiner Speicher im Browser, nur für diese Webseite. Er bleibt auch nach dem Schließen
  erhalten. Er speichert nur Text, daher `JSON.stringify(objekt)` → Text und `JSON.parse(text)` → Objekt
  (siehe `js/storage.js`). In Chrome siehst du ihn unter **F12 → Application → Local Storage**.
- **try/catch:** Fängt Fehler ab. Wenn localStorage nicht geht (z. B. privater Modus), läuft das Spiel trotzdem.
- **Elemente erzeugen:** Spielerlisten werden mit `document.createElement` gebaut (Hilfsfunktion `el()`).
  Namen werden über `textContent` eingesetzt, nie über `innerHTML`. So kann ein Name wie `<b>Tim</b>` keinen
  HTML-Code einschleusen.
- **Formulare:** `<form>` mit `submit`-Event. Enter auf der Tastatur sendet das Formular ab.
  `event.preventDefault()` verhindert, dass der Browser die Seite neu lädt.
- **Wiederherstellen nach Neuladen:** `restoreGame()` lädt den gespeicherten Stand. Ein Timer, der lief, steht
  danach auf Pause (siehe ENTSCHEIDUNGEN Nr. 4).
- **Punkteregeln ändern:** In `js/scoring.js` z. B. `fail: () => 0` eintragen, dann gibt es keinen Abzug mehr.
