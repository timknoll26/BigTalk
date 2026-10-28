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
