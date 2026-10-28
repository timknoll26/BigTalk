# Big Talk

Ein Partyspiel zum Überbieten – läuft auf einem einzigen Handy.

**▶ Spielen:** https://timknoll26.github.io/BigTalk/

Das Handy zeigt eine Challenge („Wie viele Liegestütze schaffst du am Stück?“). Haben alle sie verstanden,
drückt jemand auf **Start**. 15 Sekunden lang überbieten sich alle lautstark – niemand muss etwas eintippen.
Ist die Zeit um, muss der Höchstbieter sofort beweisen, dass er es schafft. Geht eine Karte gerade nicht,
wird sie übersprungen.

- Reines HTML, CSS und JavaScript, kein Server, keine Accounts
- Läuft nach dem ersten Öffnen offline und lässt sich auf den Homescreen legen (PWA)
- Spieler, Punkte und eigene Karten bleiben im Browser gespeichert

## Dokumentation

- [PLAN.md](PLAN.md) – Aufbau und Dateistruktur
- [ENTSCHEIDUNGEN.md](ENTSCHEIDUNGEN.md) – warum etwas so gebaut ist
- [LERNEN.md](LERNEN.md) – Erklärungen der Konzepte, Etappe für Etappe
- [TESTEN.md](TESTEN.md) – was am echten Handy geprüft werden muss
- [IDEEN.md](IDEEN.md) – Ideen für später (Online-Version, Spielmodi …)

## Lokal starten

```
python -m http.server 8000
```

Dann http://localhost:8000 öffnen (Handygröße: http://localhost:8000/tools/handy-vorschau.html).
