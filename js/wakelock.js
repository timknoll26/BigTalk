// Hält den Bildschirm während des Spiels an.
//
// 1. Wahl: Screen Wake Lock API (Chrome/Android, Safari ab iOS 16.4).
// 2. Fallback für ältere Browser: ein unsichtbares, stummes Video in Endlosschleife.
//    Solange ein Video läuft, schalten die meisten Handys den Bildschirm nicht ab
//    (gleicher Trick wie die Bibliothek NoSleep.js). Das Video kommt aus einem winzigen
//    Canvas, es gibt also keine Videodatei.
//
// Der Browser gibt die Sperre selbst frei, wenn die Seite in den Hintergrund geht.
// Darum wird sie beim Zurückkehren neu angefordert.

let wanted = false;
let sentinel = null; // das Wake-Lock-Objekt, solange aktiv
let fallbackVideo = null;
let fallbackTimer = null;

export const wakeLockSupported = 'wakeLock' in navigator;

async function requestWakeLock() {
  if (sentinel || document.visibilityState !== 'visible') return;
  try {
    sentinel = await navigator.wakeLock.request('screen');
    sentinel.addEventListener('release', () => {
      sentinel = null;
    });
  } catch {
    // z. B. Energiesparmodus – dann den Fallback versuchen.
    startFallback();
  }
}

function startFallback() {
  if (fallbackVideo) {
    fallbackVideo.play().catch(() => {});
    return;
  }
  const canvas = document.createElement('canvas');
  if (!canvas.captureStream) return; // geht nicht → Bildschirm darf ausgehen, Spiel läuft trotzdem
  canvas.width = canvas.height = 2;
  const g = canvas.getContext('2d');
  // Regelmäßig neu zeichnen, damit der Video-Stream Bilder liefert.
  fallbackTimer = setInterval(() => {
    g.fillStyle = g.fillStyle === '#000000' ? '#010101' : '#000000';
    g.fillRect(0, 0, 2, 2);
  }, 1000);

  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.setAttribute('playsinline', '');
  video.setAttribute('aria-hidden', 'true');
  video.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0.01;pointer-events:none;bottom:0;left:0';
  video.srcObject = canvas.captureStream(1);
  document.body.append(video);
  fallbackVideo = video;
  video.play().catch(() => {});
}

function stopFallback() {
  if (!fallbackVideo) return;
  fallbackVideo.pause();
  fallbackVideo.srcObject?.getTracks().forEach((t) => t.stop());
  fallbackVideo.remove();
  fallbackVideo = null;
  clearInterval(fallbackTimer);
}

/** true = Bildschirm wach halten, false = normal ausgehen lassen. Mehrfachaufrufe sind harmlos. */
export function keepAwake(on) {
  if (on === wanted) return;
  wanted = on;
  if (on) {
    wakeLockSupported ? requestWakeLock() : startFallback();
  } else {
    sentinel?.release();
    sentinel = null;
    stopFallback();
  }
}

document.addEventListener('visibilitychange', () => {
  if (wanted && document.visibilityState === 'visible') {
    wakeLockSupported ? requestWakeLock() : startFallback();
  }
});
