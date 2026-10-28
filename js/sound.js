// Alle Töne werden live erzeugt (Web Audio API) – es gibt keine Audiodateien.
// Ein Oszillator erzeugt eine Schwingung (Ton), ein Gain-Knoten regelt die Lautstärke.

let ctx = null;
let enabled = true;

export function setSoundEnabled(on) {
  enabled = on;
}

// Browser erlauben Audio erst nach einer Nutzeraktion (Tippen).
// Darum wird der AudioContext beim ersten Tippen erzeugt bzw. aufgeweckt.
export function unlockAudio() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  if (!ctx) ctx = new AC();
  if (ctx.state === 'suspended') ctx.resume();
}

/** Spielt einen einzelnen Ton. `at` = Startverzögerung in Sekunden. */
function tone({ freq, freqEnd = freq, duration = 0.15, type = 'square', volume = 0.25, at = 0 }) {
  if (!enabled || !ctx) return;
  const t0 = ctx.currentTime + at;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (freqEnd !== freq) osc.frequency.exponentialRampToValueAtTime(freqEnd, t0 + duration);
  // Kurzes Ein- und Ausblenden verhindert Knacksen.
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

export const sounds = {
  bid() {
    tone({ freq: 660, freqEnd: 990, duration: 0.08, type: 'triangle', volume: 0.3 });
  },
  undo() {
    tone({ freq: 500, freqEnd: 300, duration: 0.1, type: 'triangle', volume: 0.25 });
  },
  tick() {
    tone({ freq: 1200, duration: 0.05, type: 'square', volume: 0.15 });
  },
  // Laut und unverkennbar: drei schnelle, abfallende Sirenenstöße.
  timeUp() {
    for (let i = 0; i < 3; i++) {
      tone({ freq: 1100, freqEnd: 500, duration: 0.28, type: 'sawtooth', volume: 0.45, at: i * 0.3 });
    }
  },
  go() {
    tone({ freq: 440, duration: 0.12, type: 'square', volume: 0.3 });
    tone({ freq: 880, duration: 0.25, type: 'square', volume: 0.3, at: 0.15 });
  },
  success() {
    [523, 659, 784, 1047].forEach((f, i) => tone({ freq: f, duration: 0.18, type: 'triangle', volume: 0.35, at: i * 0.1 }));
  },
  fail() {
    [400, 350, 300].forEach((f, i) => tone({ freq: f, freqEnd: f * 0.9, duration: 0.3, type: 'sawtooth', volume: 0.3, at: i * 0.3 }));
  },
};
