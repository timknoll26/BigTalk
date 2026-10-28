// Einstiegspunkt: hält den Spielzustand, verbindet Buttons mit Aktionen
// und zeichnet den jeweils sichtbaren Bildschirm.
//
// Grundprinzip: Ein Event-Handler ändert `state` und ruft dann render() auf.
// render() speichert den Zustand und passt das HTML an.
//
// Ablauf einer Runde:
//   card (Timer idle → running ⇄ paused) ──Zeit um──► prove ──Urteil──► result ──► nächste Karte

import { DEFAULT_CARDS, CATEGORIES } from './cards.js';
import { drawCard } from './deck.js';
import { Countdown } from './timer.js';
import { vibrate, setVibrationEnabled } from './feedback.js';
import { load, save } from './storage.js';
import { scoreDelta, formatDelta } from './scoring.js';
import { keepAwake } from './wakelock.js';

const MAX_PLAYERS = 12;
const NO_SCORE = 'none'; // bidderId, wenn bewusst ohne Wertung gespielt wird
const TIMER_MIN = 5;
const TIMER_MAX = 60;
const TIMER_STEP = 5;
const TOSS_MS = 320; // Dauer der Wegflieg-Animation beim Überspringen (siehe .toss in style.css)

// ---------- Zustand ----------
const DEFAULT_SETTINGS = {
  timerSeconds: 15,
  vibration: true,
  categories: CATEGORIES.map((c) => c.id), // eingeschaltete Kategorien
};

// Gespeicherte Einstellungen über die Standardwerte legen – so bekommen auch
// alte Speicherstände neue Einstellungen mit Standardwert.
const settings = { ...DEFAULT_SETTINGS, ...load('settings', {}) };
settings.categories = settings.categories.filter((id) => CATEGORIES.some((c) => c.id === id));
if (settings.categories.length === 0) settings.categories = DEFAULT_SETTINGS.categories;

let customCards = load('customCards', []);
let players = load('players', []); // [{ id, name, score }]

const state = {
  screen: 'start', // 'start' | 'game' | 'settings' | 'cards'
  deck: [], // noch nicht gespielte Karten-IDs
  lastCardId: null,
  // Die laufende Runde (oder null):
  // { cardId, phase: 'card'|'prove'|'result',
  //   timer: 'idle'|'running'|'paused', endsAt: null|Zeitstempel, remainingMs: null|Zahl,
  //   proofState: 'idle'|'running'|'done', bidderId: null|'none'|Spieler-ID,
  //   success: null|true|false, delta: null|Zahl }
  round: null,
};

// ---------- Hilfsfunktionen ----------
const $ = (id) => document.getElementById(id);

const roundMs = () => settings.timerSeconds * 1000;

function allCards() {
  return [...DEFAULT_CARDS, ...customCards];
}

/** Karten der eingeschalteten Kategorien – nur daraus wird gezogen. */
function playableCards() {
  return allCards().filter((c) => settings.categories.includes(c.category));
}

function findCard(id) {
  return allCards().find((c) => c.id === id);
}

function currentCard() {
  return state.round && findCard(state.round.cardId);
}

function findPlayer(id) {
  return players.find((p) => p.id === id);
}

function category(id) {
  return CATEGORIES.find((c) => c.id === id) ?? { name: id, color: 'muted' };
}

/** Erzeugt ein Element. Text immer über textContent, nie innerHTML – so kann ein Name kein HTML einschleusen. */
function el(tag, { className, text, attrs, style } = {}, children = []) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  if (attrs) Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
  if (style) node.setAttribute('style', style);
  children.forEach((c) => node.append(c));
  return node;
}

const categoryDot = (catId) => el('span', { className: 'dot', style: `--c: var(--${category(catId).color})` });

let toastTimeout = null;
function toast(message) {
  const box = $('toast');
  box.textContent = message;
  box.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => box.classList.remove('show'), 2600);
}

/** Startet eine CSS-Animation neu (Klasse weg, Reflow erzwingen, Klasse wieder dran). */
function replayAnimation(node, className) {
  node.classList.remove(className);
  void node.offsetWidth;
  node.classList.add(className);
}

// ---------- Speichern & Laden ----------
function saveGame() {
  save('game', {
    screen: state.screen,
    deck: state.deck,
    lastCardId: state.lastCardId,
    round: state.round,
  });
}

function savePlayers() {
  save('players', players);
}

function saveSettings() {
  save('settings', settings);
  setVibrationEnabled(settings.vibration);
}

/** Stellt nach dem Neuladen den letzten Stand her – ein laufender Timer wird zur Pause. */
function restoreGame() {
  const saved = load('game', null);
  if (!saved) return;
  state.screen = saved.screen === 'game' ? 'game' : 'start';
  state.deck = Array.isArray(saved.deck) ? saved.deck : [];
  state.lastCardId = saved.lastCardId ?? null;
  state.round = saved.round ?? null;

  const r = state.round;
  if (!r) return;
  // Karte gelöscht oder Spielstand aus einer älteren Version → Runde verwerfen.
  if (!findCard(r.cardId) || !['card', 'prove', 'result'].includes(r.phase)) {
    state.round = null;
    state.screen = 'start';
    return;
  }
  if (r.phase === 'card' && r.timer === 'running') {
    const left = (r.endsAt ?? 0) - Date.now();
    if (left > 1000) {
      // Restzeit merken, aber nicht ungefragt weiterlaufen lassen.
      r.timer = 'paused';
      r.remainingMs = left;
      r.endsAt = null;
    } else {
      // Die Zeit ist abgelaufen, während die Seite zu war.
      enterProve(r);
    }
  }
  if (r.phase === 'prove' && r.proofState === 'running') r.proofState = 'idle';
}

// ---------- Timer ----------
let lastWholeSecond = null;

const roundTimer = new Countdown({
  onTick(ms) {
    renderRoundRing(ms);
    // In den letzten 5 Sekunden jede volle Sekunde: kurz vibrieren, Zahl pulsiert.
    const s = Math.ceil(ms / 1000);
    if (s !== lastWholeSecond && s > 0 && s <= 5) {
      vibrate(40);
      replayAnimation($('round-ring-value'), 'beat');
      if (s <= 3) replayAnimation($('play-card'), 'nervous');
    }
    lastWholeSecond = s;
  },
  onEnd: onTimeUp,
});

const proofTimer = new Countdown({
  onTick: renderProofRing,
  onEnd() {
    state.round.proofState = 'done';
    vibrate([300, 100, 300]);
    render();
  },
});

function runRoundTimer(ms) {
  const r = state.round;
  r.timer = 'running';
  r.remainingMs = null;
  r.endsAt = Date.now() + ms; // nur fürs Wiederherstellen nach dem Neuladen
  lastWholeSecond = null;
  roundTimer.start(ms);
}

// ---------- Aktionen: Spielablauf ----------
function startGame() {
  state.screen = 'game';
  if (!state.round) {
    nextCard();
    return;
  }
  render();
}

function nextCard() {
  roundTimer.stop();
  proofTimer.stop();
  const result = drawCard(state.deck, playableCards(), state.lastCardId);
  if (!result.card) {
    state.round = null;
    state.screen = 'start';
    toast('Keine Karten in den gewählten Kategorien.');
    render();
    return;
  }
  if (result.reshuffled) toast('Alle Karten gespielt – neu gemischt!');
  state.deck = result.deck;
  state.lastCardId = result.card.id;
  state.round = {
    cardId: result.card.id,
    phase: 'card',
    timer: 'idle',
    endsAt: null,
    remainingMs: null,
    proofState: 'idle',
    bidderId: null,
    success: null,
    delta: null,
  };
  state.screen = 'game';
  render();
  const cardEl = $('play-card');
  cardEl.classList.remove('toss');
  replayAnimation(cardEl, 'deal');
}

/** Ein Knopf für alles: starten, pausieren, weiter. */
function onRingTap() {
  const r = state.round;
  if (r.timer === 'idle') {
    vibrate(60);
    runRoundTimer(roundMs());
  } else if (r.timer === 'running') {
    r.remainingMs = roundTimer.remaining();
    r.endsAt = null;
    r.timer = 'paused';
    roundTimer.stop();
  } else {
    runRoundTimer(r.remainingMs ?? roundMs());
  }
  render();
}

/** Alle sind fertig mit Bieten, bevor die Zeit um ist. */
function finishEarly() {
  if (state.round.timer === 'idle') return;
  roundTimer.stop();
  onTimeUp();
}

let skipping = false;
/** Karte geht gerade nicht → ohne Punkte zur nächsten. Mit Wegflieg-Animation, wenn die Karte sichtbar ist. */
function skipCard() {
  if (skipping) return;
  roundTimer.stop();
  proofTimer.stop();
  if (state.round?.phase !== 'card') {
    nextCard();
    return;
  }
  skipping = true;
  replayAnimation($('play-card'), 'toss');
  setTimeout(() => {
    skipping = false;
    nextCard();
  }, TOSS_MS);
}

/** Pausiert alles, was gerade läuft – z. B. beim Verlassen des Spielbildschirms. */
function pauseRunning() {
  const r = state.round;
  if (!r) return;
  if (roundTimer.running) {
    r.remainingMs = roundTimer.remaining();
    r.endsAt = null;
    r.timer = 'paused';
    roundTimer.stop();
  }
  if (proofTimer.running) {
    // Ein unterbrochener Beweis muss neu gestartet werden.
    proofTimer.stop();
    r.proofState = 'idle';
  }
}

function goHome() {
  pauseRunning();
  state.screen = 'start';
  render();
}

/** Setzt eine Runde in die Beweis-Phase (ohne Vibration/Animation – das macht onTimeUp). */
function enterProve(r) {
  r.phase = 'prove';
  r.timer = 'idle';
  r.endsAt = null;
  r.remainingMs = null;
  r.proofState = 'idle';
  r.bidderId = null;
}

function onTimeUp() {
  enterProve(state.round);
  vibrate([500, 150, 500, 150, 800]);
  render();
  // Stempel und Blitz nur beim echten Ablauf, nicht beim Zurückkehren.
  replayAnimation($('stamp'), 'slam');
  replayAnimation($('flash'), 'go');
}

function chooseBidder(id) {
  state.round.bidderId = id;
  render();
}

function changeBidder() {
  if (proofTimer.running) return; // während des Beweises nicht umentscheiden
  state.round.bidderId = null;
  state.round.proofState = 'idle';
  render();
}

function onProofRingTap() {
  const r = state.round;
  if (r.proofState !== 'idle') return;
  r.proofState = 'running';
  vibrate(100);
  proofTimer.start(currentCard().proofSeconds * 1000);
  render();
}

function finishRound(success) {
  proofTimer.stop();
  const r = state.round;
  r.success = success;
  r.phase = 'result';
  r.delta = null;

  const player = findPlayer(r.bidderId);
  if (player) {
    r.delta = scoreDelta(success, { card: currentCard() });
    player.score += r.delta;
    savePlayers();
  }
  vibrate(success ? [80, 60, 80] : 400);
  render();
  replayAnimation($('result-mark'), 'draw');
}

/** Falls aus Versehen der falsche Ergebnis-Button getippt wurde. */
function revertResult() {
  const r = state.round;
  const player = findPlayer(r.bidderId);
  if (player && r.delta !== null) {
    player.score -= r.delta;
    savePlayers();
  }
  r.success = null;
  r.delta = null;
  r.phase = 'prove';
  r.proofState = 'idle';
  render();
}

// ---------- Aktionen: Spieler & Punkte ----------
function addPlayer(event) {
  event.preventDefault();
  const input = $('input-player');
  const name = input.value.trim().replace(/\s+/g, ' ');
  const error = (msg) => {
    $('player-error').textContent = msg;
    $('player-error').hidden = false;
  };
  if (!name) return error('Bitte einen Namen eingeben.');
  if (players.length >= MAX_PLAYERS) return error(`Höchstens ${MAX_PLAYERS} Spieler.`);
  if (players.some((p) => p.name.toLowerCase() === name.toLowerCase())) return error(`„${name}“ gibt es schon.`);

  players.push({ id: `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, name, score: 0 });
  savePlayers();
  input.value = '';
  $('player-error').hidden = true;
  render();
  input.focus(); // gleich den nächsten Namen tippen
}

function removePlayer(id) {
  players = players.filter((p) => p.id !== id);
  savePlayers();
  if (state.round && state.round.bidderId === id && state.round.phase === 'prove') state.round.bidderId = null;
  render();
}

function resetGame() {
  roundTimer.stop();
  proofTimer.stop();
  players.forEach((p) => (p.score = 0));
  savePlayers();
  state.deck = [];
  state.lastCardId = null;
  state.round = null;
  state.screen = 'start';
  $('dlg-scores').close();
  render();
  toast('Spiel zurückgesetzt.');
}

function confirmReset() {
  askConfirm(
    { title: 'Spiel zurücksetzen?', text: 'Alle Punkte werden auf 0 gesetzt und die Karten neu gemischt. Die Spieler bleiben.', ok: 'Zurücksetzen' },
    resetGame,
  );
}

// ---------- Aktionen: Kategorien, Einstellungen, eigene Karten ----------
function openScreen(name) {
  pauseRunning();
  state.screen = name;
  render();
  window.scrollTo(0, 0);
}

function toggleCategory(id) {
  const on = settings.categories.includes(id);
  if (on && settings.categories.length === 1) {
    toast('Mindestens eine Kategorie muss an sein.');
    return;
  }
  settings.categories = on ? settings.categories.filter((c) => c !== id) : [...settings.categories, id];
  saveSettings();
  render();
}

function changeTimer(direction) {
  const next = settings.timerSeconds + direction * TIMER_STEP;
  settings.timerSeconds = Math.min(TIMER_MAX, Math.max(TIMER_MIN, next));
  saveSettings();
  render();
}

function setToggle(key, value) {
  settings[key] = value;
  saveSettings();
  render();
}

function testVibration() {
  vibrate([200, 100, 200]);
}

/** Liest eine Ganzzahl aus einem Eingabefeld; leer → null. */
function readInt(id) {
  const raw = $(id).value.trim();
  return raw === '' ? null : Number(raw);
}

function addCustomCard(event) {
  event.preventDefault();
  const text = $('card-text').value.trim().replace(/\s+/g, ' ');
  const unit = $('card-unit').value.trim();
  const start = readInt('card-start');
  const proof = readInt('card-proof');

  const problem =
    (!text && 'Bitte eine Challenge eingeben.') ||
    (!unit && 'Bitte eine Einheit eingeben (z. B. „Sekunden“).') ||
    ((!Number.isInteger(start) || start < 1) && 'Startgebot muss eine ganze Zahl ab 1 sein.') ||
    (proof !== null && (!Number.isInteger(proof) || proof < 5 || proof > 600) && 'Beweiszeit: 5 bis 600 Sekunden oder leer lassen.');
  if (problem) {
    $('card-error').textContent = problem;
    $('card-error').hidden = false;
    return;
  }

  const card = {
    id: `c${Date.now().toString(36)}`,
    category: $('card-category').value,
    text,
    unit,
    start,
    step: 1,
  };
  if (proof !== null) card.proofSeconds = proof;
  customCards.push(card);
  save('customCards', customCards);

  $('form-card').reset();
  $('card-category').value = card.category; // Kategorie für die nächste Karte beibehalten
  $('card-error').hidden = true;
  toast(settings.categories.includes(card.category) ? 'Karte gespeichert!' : 'Gespeichert – Kategorie ist aber gerade aus.');
  render();
}

function deleteCustomCard(id) {
  const card = customCards.find((c) => c.id === id);
  askConfirm({ title: 'Karte löschen?', text: `„${card.text}“`, ok: 'Löschen' }, () => {
    customCards = customCards.filter((c) => c.id !== id);
    save('customCards', customCards);
    // Lief die gelöschte Karte gerade? Dann ist die Runde vorbei.
    if (state.round && state.round.cardId === id) state.round = null;
    state.deck = state.deck.filter((d) => d !== id);
    render();
  });
}

// ---------- Dialoge ----------
function openScores() {
  renderScoreboard($('scores-list'));
  $('scores-empty').hidden = players.length > 0;
  $('dlg-scores').showModal();
}

let onConfirm = null;
function askConfirm({ title, text, ok }, action) {
  $('confirm-title').textContent = title;
  $('confirm-text').textContent = text;
  $('btn-confirm-ok').textContent = ok;
  onConfirm = action;
  $('dlg-confirm').showModal();
}

// ---------- Darstellung ----------
function showScreen(id) {
  document.querySelectorAll('.screen').forEach((s) => {
    s.classList.toggle('active', s.id === id);
  });
}

function render() {
  saveGame(); // jede Änderung landet sofort im Speicher
  keepAwake(state.screen === 'game'); // Bildschirm nur während des Spiels wach halten

  if (state.screen === 'settings' || state.screen === 'cards') {
    state.screen === 'settings' ? renderSettings() : renderCards();
    showScreen(`screen-${state.screen}`);
    return;
  }
  if (state.screen === 'start' || !state.round) {
    renderStart();
    showScreen('screen-start');
    return;
  }
  const phase = state.round.phase;
  if (phase === 'card') renderCard();
  if (phase === 'prove') renderProve();
  if (phase === 'result') renderResult();
  showScreen(`screen-${phase}`);
}

function renderStart() {
  $('btn-start').textContent = state.round ? 'Weiterspielen' : "Los geht's";
  $('btn-scores-start').hidden = players.length === 0;
  $('players-count').textContent = players.length ? String(players.length) : 'optional';

  $('players-list').replaceChildren(
    ...players.map((p) => {
      const remove = el('button', { text: '×', attrs: { type: 'button', 'aria-label': `${p.name} entfernen` } });
      remove.addEventListener('click', () => removePlayer(p.id));
      return el('li', { className: 'player-chip' }, [el('span', { text: p.name }), remove]);
    }),
  );

  $('category-toggles').replaceChildren(
    ...CATEGORIES.map((cat) => {
      const count = allCards().filter((c) => c.category === cat.id).length;
      const on = settings.categories.includes(cat.id);
      const b = el('button', { className: 'cat-toggle', attrs: { type: 'button', 'aria-pressed': String(on) } }, [
        el('span', { className: 'cat-name' }, [categoryDot(cat.id), el('span', { text: cat.name })]),
        el('small', { text: `${count} Karten` }),
      ]);
      b.addEventListener('click', () => toggleCategory(cat.id));
      return b;
    }),
  );
}

/** Befüllt eine Karte (Spielkarte „pc“ oder Mini-Karte „pv“). */
function fillCard(prefix, card) {
  const cat = category(card.category);
  $(`${prefix}-dot`).style.setProperty('--c', `var(--${cat.color})`);
  $(`${prefix}-cat`).textContent = cat.name;
  $(`${prefix}-text`).textContent = card.text;
}

function renderCard() {
  const card = currentCard();
  fillCard('pc', card);
  const meta = [`Startgebot: ${card.start} ${card.unit}`];
  if (card.proofSeconds) meta.push(`Beweis in ${card.proofSeconds} s`);
  $('pc-meta').textContent = meta.join(' · ');

  const remaining = playableCards().length;
  $('deck-info').textContent = `${state.deck.length} von ${remaining} Karten übrig`;
  $('btn-scores').hidden = players.length === 0;

  // „Fertig“ ergibt erst Sinn, wenn die Zeit läuft; Platz bleibt reserviert.
  const idle = state.round.timer === 'idle';
  $('btn-finish').classList.toggle('invisible', idle);
  $('btn-finish').disabled = idle;

  renderRoundRing(roundTimer.running ? roundTimer.remaining() : state.round.remainingMs ?? roundMs());
}

/** Setzt einen Ring: Anteil 0–1, Text in der Mitte, Zustandsklasse. */
function setRing(prefix, fraction, value, sub, mode) {
  const ring = $(`${prefix}-ring`);
  ['is-idle', 'is-paused', 'is-urgent', 'is-done'].forEach((c) => ring.classList.toggle(c, c === `is-${mode}`));
  $(`${prefix}-ring-progress`).style.strokeDashoffset = String(100 - Math.max(0, Math.min(1, fraction)) * 100);
  $(`${prefix}-ring-value`).textContent = value;
  $(`${prefix}-ring-sub`).textContent = sub;
}

function renderRoundRing(ms) {
  const r = state.round;
  if (!r || r.phase !== 'card') return;
  const seconds = Math.ceil(ms / 1000);
  const ring = $('round-ring');
  if (r.timer === 'idle') {
    setRing('round', 1, 'Start', `${settings.timerSeconds} Sekunden`, 'idle');
    ring.setAttribute('aria-label', 'Timer starten');
  } else if (r.timer === 'paused') {
    setRing('round', ms / roundMs(), seconds, 'Pause · tippen', 'paused');
    ring.setAttribute('aria-label', 'Timer fortsetzen');
  } else {
    setRing('round', ms / roundMs(), seconds, 'Bietet!', seconds <= 5 ? 'urgent' : 'running');
    ring.setAttribute('aria-label', 'Timer pausieren');
  }
}

function renderProve() {
  const card = currentCard();
  const r = state.round;
  // Wurde der gewählte Bieter inzwischen gelöscht? Dann neu wählen.
  if (r.bidderId && r.bidderId !== NO_SCORE && !findPlayer(r.bidderId)) r.bidderId = null;

  fillCard('pv', card);

  const needPick = players.length > 0 && r.bidderId === null;
  $('prove-bidder').hidden = !needPick;
  if (needPick) {
    $('bidder-buttons').replaceChildren(
      ...players.map((p) => {
        const b = el('button', { className: 'btn', text: p.name, attrs: { type: 'button' } });
        b.addEventListener('click', () => chooseBidder(p.id));
        return b;
      }),
    );
  }

  const who = $('prove-who');
  who.hidden = players.length === 0 || needPick;
  const bidder = findPlayer(r.bidderId);
  who.textContent = bidder ? `${bidder.name} ist dran` : 'Ohne Wertung · ändern';

  const hasProofTimer = Boolean(card.proofSeconds);
  $('proof-ring').hidden = needPick || !hasProofTimer;
  if (hasProofTimer) renderProofRing(r.proofState === 'running' ? proofTimer.remaining() : card.proofSeconds * 1000);
  $('verdict').hidden = needPick;
}

function renderProofRing(ms) {
  const r = state.round;
  const total = currentCard().proofSeconds * 1000;
  const seconds = Math.ceil(ms / 1000);
  if (r.proofState === 'idle') setRing('proof', 1, 'Start', `${total / 1000} s Beweis`, 'idle');
  else if (r.proofState === 'done') setRing('proof', 0, 'Zeit um!', '', 'done');
  else setRing('proof', ms / total, seconds, 'läuft', seconds <= 5 ? 'urgent' : 'running');
}

function renderResult() {
  const r = state.round;
  const mark = $('result-mark');
  mark.classList.toggle('win', r.success);
  mark.classList.toggle('lose', !r.success);
  // Haken bzw. Kreuz als SVG-Pfad
  $('mark-path').setAttribute('d', r.success ? 'M38 62 L54 77 L83 45' : 'M44 44 L76 76 M76 44 L44 76');
  $('result-title').textContent = r.success ? 'Geschafft!' : 'Nicht geschafft';

  const player = findPlayer(r.bidderId);
  const points = $('result-points');
  points.textContent = player && r.delta !== null ? `${player.name} ${formatDelta(r.delta)}` : '';
  points.className = `result-points ${r.delta > 0 ? 'win' : 'lose'}`;
  renderScoreboard($('result-scores'), player?.id);
}

/** Rangliste; bei Gleichstand teilen sich Spieler den Platz. */
function renderScoreboard(list, highlightId = null) {
  const sorted = players.slice().sort((a, b) => b.score - a.score);
  list.replaceChildren(
    ...sorted.map((p) => {
      const rank = 1 + sorted.filter((o) => o.score > p.score).length;
      const classes = [rank === 1 ? 'leader' : '', p.id === highlightId ? 'highlight' : ''].join(' ').trim();
      return el('li', { className: classes }, [
        el('span', { className: 'rank', text: `${rank}.` }),
        el('span', { className: 'name', text: p.name }),
        el('span', { className: 'score', text: p.score }),
      ]);
    }),
  );
}

function renderSettings() {
  $('timer-setting').textContent = `${settings.timerSeconds} s`;
  $('btn-timer-down').disabled = settings.timerSeconds <= TIMER_MIN;
  $('btn-timer-up').disabled = settings.timerSeconds >= TIMER_MAX;
  $('toggle-vibration').checked = settings.vibration;
  $('vibration-note').hidden = 'vibrate' in navigator;
}

function renderCards() {
  const select = $('card-category');
  if (select.options.length === 0) {
    CATEGORIES.forEach((c) => select.append(el('option', { text: c.name, attrs: { value: c.id } })));
  }
  $('custom-count').textContent = customCards.length ? String(customCards.length) : '';
  $('custom-empty').hidden = customCards.length > 0;
  $('custom-list').replaceChildren(
    ...customCards.map((card) => {
      const meta = [category(card.category).name, `ab ${card.start} ${card.unit}`];
      if (card.proofSeconds) meta.push(`${card.proofSeconds} s Beweis`);
      const del = el('button', { className: 'icon-btn', attrs: { type: 'button', 'aria-label': 'Karte löschen' } });
      del.innerHTML = '<svg class="icon"><use href="#i-trash"/></svg>'; // fester Inhalt, keine Nutzerdaten
      del.addEventListener('click', () => deleteCustomCard(card.id));
      return el('li', {}, [
        el('div', { className: 'info' }, [
          el('div', { className: 'text', text: card.text }),
          el('div', { className: 'meta' }, [categoryDot(card.category), el('span', { text: meta.join(' · ') })]),
        ]),
        del,
      ]);
    }),
  );
}

// ---------- Events verbinden ----------
function bindEvents() {
  $('btn-start').addEventListener('click', startGame);
  $('btn-home').addEventListener('click', goHome);
  $('round-ring').addEventListener('click', onRingTap);
  $('btn-finish').addEventListener('click', finishEarly);
  $('btn-skip').addEventListener('click', skipCard);
  $('btn-skip-prove').addEventListener('click', skipCard);
  $('btn-no-score').addEventListener('click', () => chooseBidder(NO_SCORE));
  $('prove-who').addEventListener('click', changeBidder);
  $('proof-ring').addEventListener('click', onProofRingTap);
  $('btn-success').addEventListener('click', () => finishRound(true));
  $('btn-fail').addEventListener('click', () => finishRound(false));
  $('btn-next').addEventListener('click', nextCard);
  $('btn-revert').addEventListener('click', revertResult);

  $('form-player').addEventListener('submit', addPlayer);
  $('btn-scores').addEventListener('click', openScores);
  $('btn-scores-start').addEventListener('click', openScores);
  $('btn-reset').addEventListener('click', confirmReset);
  $('btn-reset-settings').addEventListener('click', confirmReset);

  $('btn-open-settings').addEventListener('click', () => openScreen('settings'));
  $('btn-open-cards').addEventListener('click', () => openScreen('cards'));
  document.querySelectorAll('[data-home]').forEach((b) => b.addEventListener('click', goHome));
  $('btn-timer-down').addEventListener('click', () => changeTimer(-1));
  $('btn-timer-up').addEventListener('click', () => changeTimer(1));
  $('toggle-vibration').addEventListener('change', (e) => setToggle('vibration', e.target.checked));
  $('btn-test-vibration').addEventListener('click', testVibration);
  $('form-card').addEventListener('submit', addCustomCard);

  $('btn-confirm-ok').addEventListener('click', () => {
    $('dlg-confirm').close();
    onConfirm?.();
    onConfirm = null;
  });
  ['dlg-scores', 'dlg-confirm'].forEach((id) => {
    $(id).querySelector('[data-close]').addEventListener('click', () => $(id).close());
  });
}

setVibrationEnabled(settings.vibration);
restoreGame();
bindEvents();
render();

// Service Worker anmelden → Offline-Betrieb und „Zum Startbildschirm hinzufügen“.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {
    // Ohne Service Worker läuft das Spiel normal, nur nicht offline.
  });
}
