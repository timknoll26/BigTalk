// Speichern im localStorage des Browsers. localStorage kann nur Text speichern,
// darum wird alles mit JSON.stringify in Text umgewandelt und mit JSON.parse zurückgeholt.
//
// try/catch, weil localStorage fehlschlagen kann (privater Modus, Speicher voll,
// kaputter Inhalt). Das Spiel soll dann trotzdem laufen, nur ohne Speichern.

const PREFIX = 'bigtalk.';

export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Ignorieren: Ohne Speicher geht nur das Wiederherstellen nach dem Neuladen verloren.
  }
}
