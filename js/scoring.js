// Punkteregeln – an genau einer Stelle, damit sie leicht änderbar sind.
//
// Beispiele für spätere Varianten:
//   Wissenskarten zählen doppelt:  success: ({ card }) => (card.category === 'wissen' ? 2 : 1)
//   Kein Abzug bei Misserfolg:      fail: () => 0

export const SCORING_RULES = {
  success: () => 1,
  fail: () => -1,
};

/**
 * Wie viele Punkte bekommt der Höchstbieter?
 * @param {boolean} success  geschafft?
 * @param {{ card: object }} context  zusätzliche Infos für komplexere Regeln
 */
export function scoreDelta(success, context) {
  return success ? SCORING_RULES.success(context) : SCORING_RULES.fail(context);
}

/** Text wie „+1“ oder „−1“ (mit echtem Minuszeichen). */
export function formatDelta(delta) {
  if (delta > 0) return `+${delta}`;
  if (delta < 0) return `−${Math.abs(delta)}`;
  return '±0';
}
