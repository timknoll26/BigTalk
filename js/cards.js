// Kartendaten. Jede Karte:
//   id          eindeutige Kennung (Text)
//   text        die Challenge-Frage
//   category    "geschick" | "koerper" | "wissen"
//   unit        Einheit des Gebots (z. B. "Liegestütze")
//   start       Startgebot – als Orientierung, ab wo geboten wird
//   step        Mindestschritt beim Überbieten (derzeit nur Info, siehe IDEEN.md „Online-Version“)
//   proofSeconds  optional: Zeitlimit für den Beweis in Sekunden

// `color` ist der Name einer CSS-Variable aus style.css (--gold, --coral, --sky).
export const CATEGORIES = [
  { id: 'geschick', name: 'Geschick', color: 'gold' },
  { id: 'koerper', name: 'Körper', color: 'coral' },
  { id: 'wissen', name: 'Wissen', color: 'sky' },
];

export const DEFAULT_CARDS = [
  // --- Geschick ---
  { id: 'g01', category: 'geschick', text: 'Wie viele Bottle Flips schaffst du am Stück?', unit: 'Flips', start: 1, step: 1 },
  { id: 'g02', category: 'geschick', text: 'Wie lange kannst du mit geschlossenen Augen auf einem Bein stehen?', unit: 'Sekunden', start: 10, step: 5 },
  { id: 'g03', category: 'geschick', text: 'Wie viele Münzen kannst du dir vom angewinkelten Ellbogen schnippen und mit derselben Hand fangen?', unit: 'Münzen', start: 1, step: 1 },
  { id: 'g04', category: 'geschick', text: 'Wie oft kannst du ein zusammengeknülltes Blatt Papier mit den Füßen in der Luft halten?', unit: 'Kontakte', start: 3, step: 1 },
  { id: 'g05', category: 'geschick', text: 'Wie lange kannst du einen Stift senkrecht auf einem Finger balancieren?', unit: 'Sekunden', start: 3, step: 1 },
  { id: 'g06', category: 'geschick', text: 'Wie oft hintereinander kannst du „Fischers Fritz fischt frische Fische“ fehlerfrei sagen?', unit: 'Mal', start: 1, step: 1 },
  { id: 'g07', category: 'geschick', text: 'Wie oft kannst du klatschen, während dein hochgeworfener Schlüssel in der Luft ist – und ihn dann fangen?', unit: 'Klatscher', start: 2, step: 1 },
  { id: 'g08', category: 'geschick', text: 'Wie viele von 10 Würfen triffst du mit einer zusammengeknüllten Serviette aus 2 Metern in ein Glas?', unit: 'Treffer', start: 1, step: 1 },
  { id: 'g09', category: 'geschick', text: 'Wie viele Schritte gehst du mit geschlossenen Augen exakt auf einer Fuge oder Linie am Boden?', unit: 'Schritte', start: 5, step: 1 },
  { id: 'g10', category: 'geschick', text: 'Wie lange kannst du einen Löffel an deiner Nase hängen lassen?', unit: 'Sekunden', start: 3, step: 1 },

  // --- Körper ---
  { id: 'k01', category: 'koerper', text: 'Wie viele Liegestütze schaffst du am Stück?', unit: 'Liegestütze', start: 5, step: 1 },
  { id: 'k02', category: 'koerper', text: 'Wie lange hältst du den Wandsitz (Oberschenkel waagerecht)?', unit: 'Sekunden', start: 20, step: 5 },
  { id: 'k03', category: 'koerper', text: 'Wie lange hältst du den Unterarmstütz (Plank)?', unit: 'Sekunden', start: 30, step: 5 },
  { id: 'k04', category: 'koerper', text: 'Wie viele Hampelmänner schaffst du in 30 Sekunden?', unit: 'Hampelmänner', start: 15, step: 1, proofSeconds: 30 },
  { id: 'k05', category: 'koerper', text: 'Wie lange kannst du die Luft anhalten?', unit: 'Sekunden', start: 20, step: 5 },
  { id: 'k06', category: 'koerper', text: 'Wie lange kannst du jemandem in die Augen schauen, ohne zu blinzeln?', unit: 'Sekunden', start: 10, step: 5 },
  { id: 'k07', category: 'koerper', text: 'Wie viele Burpees schaffst du in 60 Sekunden?', unit: 'Burpees', start: 8, step: 1, proofSeconds: 60 },
  { id: 'k08', category: 'koerper', text: 'Wie viele Sit-ups schaffst du in 30 Sekunden?', unit: 'Sit-ups', start: 10, step: 1, proofSeconds: 30 },
  { id: 'k09', category: 'koerper', text: 'Wie lange kannst du beide Arme seitlich waagerecht ausgestreckt halten?', unit: 'Sekunden', start: 30, step: 10 },
  { id: 'k10', category: 'koerper', text: 'Wie viele einbeinige Kniebeugen schaffst du am Stück (Bein frei wählbar)?', unit: 'Kniebeugen', start: 1, step: 1 },

  // --- Wissen ---
  { id: 'w01', category: 'wissen', text: 'Wie viele Länder in Afrika kannst du in 60 Sekunden nennen?', unit: 'Länder', start: 5, step: 1, proofSeconds: 60 },
  { id: 'w02', category: 'wissen', text: 'Wie viele Hauptstädte Europas kannst du in 60 Sekunden nennen?', unit: 'Hauptstädte', start: 5, step: 1, proofSeconds: 60 },
  { id: 'w03', category: 'wissen', text: 'Wie viele Bundesländer samt Landeshauptstadt kannst du in 45 Sekunden nennen?', unit: 'Paare', start: 3, step: 1, proofSeconds: 45 },
  { id: 'w04', category: 'wissen', text: 'Wie viele Pokémon kannst du in 30 Sekunden nennen?', unit: 'Pokémon', start: 5, step: 1, proofSeconds: 30 },
  { id: 'w05', category: 'wissen', text: 'Wie viele Automarken kannst du in 30 Sekunden nennen?', unit: 'Marken', start: 5, step: 1, proofSeconds: 30 },
  { id: 'w06', category: 'wissen', text: 'Wie viele Tiere, die mit „B“ anfangen, kannst du in 30 Sekunden nennen?', unit: 'Tiere', start: 5, step: 1, proofSeconds: 30 },
  { id: 'w07', category: 'wissen', text: 'Wie viele Primzahlen kannst du der Reihe nach ab 2 fehlerfrei aufzählen?', unit: 'Primzahlen', start: 5, step: 1 },
  { id: 'w08', category: 'wissen', text: 'Wie viele Nachkommastellen von Pi kannst du aufsagen?', unit: 'Stellen', start: 3, step: 1 },
  { id: 'w09', category: 'wissen', text: 'Wie viele Fußballvereine kannst du in 30 Sekunden nennen?', unit: 'Vereine', start: 5, step: 1, proofSeconds: 30 },
  { id: 'w10', category: 'wissen', text: 'Wie viele Disney-Filme kannst du in 45 Sekunden nennen?', unit: 'Filme', start: 5, step: 1, proofSeconds: 45 },
  { id: 'w11', category: 'wissen', text: 'Wie viele Buchstaben schaffst du, wenn du das Alphabet in 15 Sekunden rückwärts aufsagst (Z, Y, X …)?', unit: 'Buchstaben', start: 5, step: 1, proofSeconds: 15 },
];
