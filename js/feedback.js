// Vibration. Android/Chrome unterstützt navigator.vibrate, iPhones (Safari) nicht –
// dort passiert dann einfach nichts.

let enabled = true;

export function setVibrationEnabled(on) {
  enabled = on;
}

/** @param {number|number[]} pattern  Millisekunden: vibrieren, Pause, vibrieren … */
export function vibrate(pattern) {
  if (enabled && 'vibrate' in navigator) navigator.vibrate(pattern);
}
