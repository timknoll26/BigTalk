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

## Etappe 4 – Kategorien, eigene Karten, Einstellungen

**15. Kategorien als große Schalter direkt auf dem Startbildschirm**
- Gewählt: Drei Kacheln (🎯 💪 🧠) unter „Los geht's“, mit Kartenanzahl.
- Warum: Eine Kernentscheidung vor jedem Spiel – soll sichtbar sein, nicht in den Einstellungen versteckt.
- Verworfen: Checkboxen im Einstellungs-Bildschirm – ein Klick mehr, wird übersehen.

**16. Die letzte Kategorie lässt sich nicht ausschalten**
- Warum: Verhindert den Zustand „leeres Deck“ schon an der Quelle. Ein Hinweis erklärt, warum.
- Verworfen: Ausschalten erlauben und erst beim Start meckern – man landet in einer Sackgasse.
- Der Randfall bleibt trotzdem abgefangen: `drawCard` liefert `null`, dann erscheint ein Hinweis.

**17. Einstellungen und eigene Karten als eigene Bildschirme statt Dialoge**
- Warum: Das Kartenformular ist lang (6 Felder) und braucht die Handytastatur. In einem Dialog wird das eng.
- Verworfen: Alles auf dem Startbildschirm – der wäre überladen.

**18. Timer-Länge in 5-Sekunden-Schritten (5–60 s) über −/+**
- Warum: Mit einer Hand bedienbar, keine Tastatur nötig.
- Verworfen: Schieberegler – auf kleinen Bildschirmen fummelig und ungenau.

**19. Startkarten sind nicht löschbar, nur eigene**
- Warum: Laut Anforderung „eigene Karten hinzufügen und löschen“. Startkarten lassen sich über die Kategorie abwählen.
  So kann man das Spiel nicht versehentlich „leer löschen“.

## Etappe 5 – PWA, Wake Lock, Feinschliff

**20. Service Worker mit „stale-while-revalidate“**
- Gewählt: Sofort aus dem Cache antworten, im Hintergrund aktualisieren. Alle App-Dateien werden bei der
  Installation vorab geladen.
- Warum: Startet sofort und offline. Änderungen erscheinen beim nächsten Öffnen von selbst, auch wenn man
  vergisst, die Cache-Version zu erhöhen.
- Verworfen: (a) Reines „cache-first“ – Updates kommen *nie*, solange die Versionsnummer nicht erhöht wird.
  (b) „network-first“ – bei schlechtem Party-WLAN wartet man beim Start auf das Netz.
- Nachteil: Nach einer Änderung zeigt der *erste* Aufruf noch die alte Version.
- Fehler beim Testen gefunden: Die erste Version beantwortete jede Navigation mit der Startseite (auch die
  Vorschau-Seite). Jetzt: Cache → Netz → nur offline die Startseite.

**21. Wake Lock API, Fallback: stummes Canvas-Video**
- Gewählt: `navigator.wakeLock.request('screen')`. Wo das fehlt (ältere iPhones vor iOS 16.4), läuft ein
  unsichtbares, stummes Video aus einem 2×2-Pixel-Canvas, wie bei NoSleep.js, nur ohne Videodatei.
- Warum: Die Anforderung „keine Medien-Dateien“ gilt sinngemäß auch hier. Der Canvas-Stream braucht keine Datei.
- Verworfen: NoSleep.js einbinden (externe Bibliothek, enthält eingebettete MP4) bzw. nur ein Hinweistext.
- Unsicher: Ob der Canvas-Trick auf alten iPhones wirkt, ist am Desktop nicht prüfbar → TESTEN.md.
- Die Sperre gilt nur im Spiel, nicht auf Start, Einstellungen oder Karten. So ist der Akku geschont.

**22. PNG-Icons einmalig aus einer SVG erzeugt**
- Warum: Android verlangt für die Installation PNG-Icons (192/512, dazu „maskable“ mit Sicherheitsrand),
  iPhones ein 180-px-Apple-Icon. Erzeugt wurden sie aus `icons/icon.svg` per Browser-Canvas.
- Verworfen: Nur SVG-Icon – wird nicht überall als App-Icon akzeptiert.

**23. Kompaktere Maße für niedrige Bildschirme (`max-height: 700px`)**
- Warum: Auf dem iPhone SE (667 px) darf während des Bietens nichts scrollen. Getestet mit allen 31 Karten.

## Version 2 – nach dem ersten Feedback

**24. Ein fester Countdown statt Timer-Reset bei jedem Gebot**
- Gewählt: Karte lesen → „Start“ → die Zeit läuft einfach ab. Niemand tippt Gebote ein.
- Warum (Feedback): Die Leute reden miteinander. Wer das Handy hält, soll nicht mittippen müssen.
- Verworfen: (a) Weiter Gebote eintippen – lenkt ab, bremst das Gespräch. (b) Timer startet automatisch beim
  Aufdecken – dann läuft die Zeit, während noch jemand vorliest.
- Die alte Mechanik (Gebote eintippen, Reset pro Gebot) passt zu einer Online-Version → IDEEN.md.
- Folge: Entscheidungen 5 und 6 (Plus-Button, Rückgängig) gelten nicht mehr. Startgebot und Mindestschritt
  bleiben in den Kartendaten, das Startgebot steht als Orientierung auf der Karte.

**25. Der Ring ist der einzige Knopf: Start, Pause, Weiter**
- Warum: Ein großes, rundes Ziel in Daumenhöhe. Es zeigt gleichzeitig die Restzeit. Vor dem Start „atmet“ es
  in Limette, damit klar ist: hier drücken.
- Verworfen: Getrennter Start-Button plus Zeitanzeige – zwei Elemente für eine Sache.
- Zusätzlich „Fertig geboten“: Wenn alle schon fertig sind, muss niemand 15 Sekunden warten.

**26. Überspringen in jeder Phase, immer ohne Punkte**
- Gewählt: „Überspringen“ auf der Karte (auch während der Timer läuft) und „Nicht machbar? Karte überspringen“
  im Beweis.
- Warum (Feedback): Manche Aufgaben gehen gerade nicht (kein Platz, keine Münze …). Im Beweis merkt man das oft erst.

**27. Neues Design „Spieltisch“ statt Neon-Party**
- Gewählt: Dunkelgrüner Filz, Karten aus cremefarbenem Papier mit Serifenschrift, Limette für Aktionen,
  Koralle für Dringlichkeit. Keine Emojis, eigene schlichte SVG-Icons.
- Warum (Feedback): Das alte Design wirkte generisch („KI-Look“): Neon-Verläufe, Leuchteffekte, schräge
  Mehrfach-Schatten, Emojis als Icons. Ein Kartentisch passt zum Spiel und gibt den Animationen Sinn.
- Verworfen: Helles, flaches Mintgrün – sauber, aber beliebig und wenig Partystimmung.
- Schrift weiterhin ohne Webfonts (offline, keine fremden Server): Serifen-Systemschriften wie Palatino/Georgia
  für Karten, Systemschrift für die Bedienung.

**28. Animationen mit Bedeutung**
- Karte wird ausgeteilt und umgedreht (neue Karte), fliegt weg (übersprungen), zittert in den letzten
  3 Sekunden. „Beweis es!“ knallt als Stempel auf den Tisch, der Bildschirm blitzt. Haken bzw. Kreuz zeichnen
  sich beim Ergebnis selbst.
- Alles reine CSS-Animationen. Mit „Bewegung reduzieren“ im System werden sie abgeschaltet.

**29. Neuladen: Restzeit als Pause, abgelaufene Zeit → direkt Beweis**
- Ersetzt Nr. 4: Da der Timer nicht mehr zurückgesetzt wird, wird die echte Restzeit gemerkt (`endsAt`).
