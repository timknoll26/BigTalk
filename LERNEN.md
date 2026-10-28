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

---

## Etappe 4 – Kategorien, eigene Karten, Einstellungen

**Was:** Kategorie-Schalter auf dem Startbildschirm, ein Bildschirm für Einstellungen (Timer-Länge, Ton,
Vibration) und einer für eigene Karten (anlegen, löschen).

**Konzepte:**
- **Objekte zusammenführen (Spread):** `{ ...DEFAULT_SETTINGS, ...load('settings', {}) }` nimmt erst alle
  Standardwerte und überschreibt sie mit den gespeicherten. Kommt später eine neue Einstellung dazu, hat sie
  automatisch ihren Standardwert.
- **Arrays filtern:** `allCards().filter((c) => settings.categories.includes(c.category))` behält nur Karten
  der eingeschalteten Kategorien. `filter`, `map`, `some`, `find` sind die Werkzeuge für Listen.
- **Formular prüfen (Validierung):** `addCustomCard` prüft jedes Feld und zeigt den ersten Fehler an.
  `novalidate` am `<form>` schaltet die kleinen Browser-Sprechblasen ab, damit unsere Meldung erscheint.
- **`aria-pressed`:** Sagt Screenreadern, ob ein Schalter-Button an oder aus ist. CSS nutzt dasselbe Attribut
  fürs Aussehen (`.cat-toggle[aria-pressed="true"]`). So stimmen Optik und Zugänglichkeit immer überein.
- **Checkbox als Kippschalter:** `.switch` ist eine normale `<input type="checkbox">`, nur per CSS umgestaltet
  (`appearance: none` + `::after` für den Knopf).

---

## Etappe 5 – PWA, Offline, Wake Lock, Feinschliff

**Was:** Big Talk lässt sich auf den Homescreen legen, läuft nach dem ersten Öffnen offline, und der
Bildschirm bleibt während des Spiels an.

**Konzepte:**
- **PWA (Progressive Web App):** Eine Webseite, die sich wie eine App verhält. Dafür braucht es
  1. ein **Manifest** (`manifest.webmanifest`): Name, Farben, Icons, `"display": "standalone"` (ohne Browserleiste);
  2. einen **Service Worker** (`sw.js`) für den Offline-Betrieb;
  3. HTTPS (GitHub Pages hat das automatisch; `localhost` gilt zum Testen auch als sicher).
- **Service Worker:** Ein Skript, das zwischen Seite und Internet sitzt. Er hat drei Phasen:
  `install` (Dateien in den Cache laden), `activate` (alte Caches löschen) und `fetch` (jede Anfrage
  abfangen und z. B. aus dem Cache beantworten). In Chrome: **F12 → Application → Service Workers / Cache Storage**.
- **Cache API:** `caches.open('bigtalk-v1')` ist ein Speicher für komplette Antworten (Datei samt Kopfzeilen).
  Wenn du etwas Größeres änderst, erhöhe `CACHE_VERSION` in `sw.js`. Dann bekommen alle eine frische Kopie.
- **Promises / async-await:** Viele Browser-Funktionen liefern das Ergebnis „später“ (z. B. `fetch`,
  `caches.open`). `await` wartet darauf, `.then(...)` macht dasselbe in anderer Schreibweise.
- **Screen Wake Lock API:** `navigator.wakeLock.request('screen')` hält den Bildschirm an. Der Browser löst die
  Sperre, wenn du die App verlässt. Darum fordert `wakelock.js` sie bei `visibilitychange` neu an.
- **Media Queries:** `@media (max-height: 700px) { … }` gilt nur auf niedrigen Bildschirmen. So passt alles auch
  auf ein iPhone SE.
- **`env(safe-area-inset-…)`:** Abstand zur iPhone-Notch und zur Home-Leiste, damit nichts verdeckt wird.

**Werkzeug:** `tools/handy-vorschau.html?w=375&h=667` simuliert andere Bildschirmgrößen.

---

## Etappe 6 – Veröffentlichen mit GitHub Pages

**Was:** Die Seite ist live unter **https://timknoll26.github.io/BigTalk/**.

**Konzepte:**
- **GitHub Pages:** GitHub liefert die Dateien aus dem `main`-Branch direkt als Webseite aus, mit HTTPS.
  Jeder `git push` auf `main` aktualisiert die Seite nach etwa einer Minute. Bei kostenlosen Konten muss das
  Repo dafür öffentlich sein.
- **Relative Pfade:** Die Seite liegt nicht unter `/`, sondern unter `/BigTalk/`. Darum stehen überall
  relative Pfade (`style.css`, `js/app.js`, `"start_url": "./"`) statt `/style.css`. Sonst würde der Browser
  die Dateien unter `timknoll26.github.io/style.css` suchen und nicht finden.
- **Ablauf einer Änderung:** Datei ändern → lokal testen → `git add` → `git commit -m "…"` → `git push`.
  Am Handy erscheint die neue Version beim übernächsten Öffnen (der Service Worker lädt sie beim ersten
  Öffnen im Hintergrund).

---

## Version 2 – neuer Ablauf und neues Design

**Was:** Nach deinem Feedback: Start-Knopf statt Eintippen, fester Countdown, Überspringen überall, neues
grünes Design mit Animationen. Ideen für später stehen in `IDEEN.md`.

**Konzepte:**
- **Zustandsautomat (State Machine):** Eine Runde ist immer in genau einem Zustand: `card` → `prove` → `result`.
  Der Timer hat eigene Unterzustände: `idle` (noch nicht gestartet), `running`, `paused`. `onRingTap()` schaut
  nach, in welchem Zustand er ist, und wechselt in den nächsten. So kann ein Knopf drei Aufgaben haben.
- **SVG-Ring als Timer:** Ein Kreis mit `pathLength="100"` hat für den Browser die Länge 100.
  `stroke-dasharray: 100` macht die Linie zu einem einzigen Strich, `stroke-dashoffset` verschiebt ihn:
  0 = voller Kreis, 100 = leer. JavaScript setzt nur diese eine Zahl, CSS animiert den Übergang.
- **CSS-Variablen:** `--lime`, `--coral` usw. stehen einmal oben in `style.css`. Die Kategorie-Farbe wird mit
  `style="--c: var(--gold)"` an ein Element gegeben, die CSS-Regel nutzt dann `var(--c)`.
- **Keyframe-Animationen:** `@keyframes deal { 0% {…} 100% {…} }` beschreibt eine Bewegung. Mit
  `replayAnimation(element, 'deal')` startet JavaScript sie neu (Klasse entfernen, neu berechnen lassen,
  Klasse wieder setzen).
- **3D-Karte:** `perspective` auf dem Elternelement, `transform-style: preserve-3d` auf der Karte,
  `backface-visibility: hidden` auf beiden Seiten. Die Rückseite ist um 180° gedreht. Dreht sich die Karte,
  sieht man erst den Rücken, dann die Vorderseite.
- **SVG-Symbole:** Icons stehen einmal oben in `index.html` als `<symbol id="i-back">`. Überall sonst setzt
  `<use href="#i-back"/>` eine Kopie ein.
- **`[hidden]` und CSS:** Das Attribut `hidden` blendet aus, *außer* eine CSS-Regel setzt `display` selbst
  (z. B. `.btn { display: inline-flex }`). Darum gibt es ganz oben `[hidden] { display: none !important; }`.
  Diesen Fehler hat der Test gefunden: „Punktestand“ war sichtbar, obwohl keine Spieler da waren.
