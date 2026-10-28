// Deck = Liste von Karten-IDs, die in dieser Runde noch nicht dran waren.
// Eine Karte wird gezogen, indem man sie vorne aus der Liste nimmt.
// Ist die Liste leer, wird neu gemischt – erst dann wiederholen sich Karten.

// Fisher-Yates-Mischen: jede Reihenfolge ist gleich wahrscheinlich.
export function shuffle(items) {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Zieht die nächste Karte.
 * @param {string[]} deck      verbleibende IDs (wird nicht verändert)
 * @param {object[]} available alle Karten, die gerade erlaubt sind (Kategorien an)
 * @param {string|null} lastId zuletzt gespielte Karte – soll nach dem Neumischen nicht sofort wiederkommen
 * @returns {{ card: object|null, deck: string[], reshuffled: boolean }}
 */
export function drawCard(deck, available, lastId = null) {
  if (available.length === 0) return { card: null, deck: [], reshuffled: false };

  const byId = new Map(available.map((c) => [c.id, c]));
  // Karten entfernen, die inzwischen gelöscht oder abgewählt wurden.
  let remaining = deck.filter((id) => byId.has(id));
  let reshuffled = false;

  if (remaining.length === 0) {
    remaining = shuffle(available.map((c) => c.id));
    // Direkte Wiederholung über die Mischgrenze hinweg vermeiden.
    if (remaining.length > 1 && remaining[0] === lastId) {
      remaining.push(remaining.shift());
    }
    reshuffled = deck.length > 0 || lastId !== null;
  }

  const [nextId, ...rest] = remaining;
  return { card: byId.get(nextId), deck: rest, reshuffled };
}
