// Einstiegspunkt: hält den Spielzustand, verbindet Buttons mit Aktionen
// und zeichnet den jeweils sichtbaren Bildschirm.
//
// Grundprinzip: Ein Event-Handler ändert `state` und ruft dann render() auf.
// render() speichert den Zustand und passt das HTML an.

import { DEFAULT_CARDS, CATEGORIES } from './cards.js';
import { drawCard } from './deck.js';
import { Countdown } from './timer.js';
import { sounds, unlockAudio, setSoundEnabled } from './sound.js';
import { vibrate, setVibrationEnabled } from './feedback.js';
import { load, save } from './storage.js';
import { scoreDelta, formatDelta } from './scoring.js';

const MAX_PLAYERS = 12;
const NO_SCORE = 'none'; // bidderId, wenn bewusst ohne Wertung gespielt wird
const TIMER_MIN = 5;
const TIMER_MAX = 60;
const TIMER_STEP = 5;

// ---------- Zustand ----------
const DEFAULT_SETTINGS = {
  timerSeconds: 15,
  sound: true,
  vibration: true,
  categories: CATEGORIES.map((c) => c.id), // eingeschaltete Kategorien
};

// Gespeicherte Einstellungen über die Standardwerte legen – so bekommen auch
// alte Speicherstände neue Einstellungen mit Standardwert.
const settings = { ...DEFAULT_SETTINGS, ...load('settings', {}) };
settings.categories = settings.categories.filter((id) => CATEGORIES.some((c) => c.id === id));
if (settings.categories.length === 0) settings.categories = DEFAULT_SETTINGS.categories;

let customCards = load('customCards', []);

const state = {
  screen: 'start', // 'start' | 'game' | 'settings' | 'cards'
  deck: [], // noch nicht gespielte Karten-IDs
  lastCardId: null,
  // Die laufende Runde (oder null):
  // { cardId, phase: 'bid'|'prove'|'result', bids: [], pausedMs: null|Zahl,
  //   proofState: 'idle'|'running'|'done', bidderId: null|'none'|Spieler-ID,
  //   success: null|true|false, delta: null|Zahl }
  round: null,
};

let players = load('players', []); // [{ id, name, score }]

// ---------- Hilfsfunktionen ----------
const $ = (id) => document.getElementById(id);

const bidMs = () => settings.timerSeconds * 1000;

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

function currentBid() {
  const bids = state.round.bids;
  return bids.length ? bids[bids.length - 1] : null;
}

/** Kleinstes Gebot, das jetzt erlaubt ist. */
function minNextBid(card) {
  const bid = currentBid();
  return bid === null ? card.start : bid + card.step;
}

function findPlayer(id) {
  return players.find((p) => p.id === id);
}

function categoryLabel(id) {
  const cat = CATEGORIES.find((c) => c.id === id);
  return cat ? `${cat.emoji} ${cat.name}` : id;
}

/** Erzeugt ein Element. Text immer über textContent, nie innerHTML – so kann ein Name kein HTML einschleusen. */
function el(tag, { className, text, attrs } = {}, children = []) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  if (attrs) Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
  children.forEach((c) => node.append(c));
  return node;
}

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
  setSoundEnabled(settings.sound);
  setVibrationEnabled(settings.vibration);
}

/** Stellt nach dem Neuladen den letzten Stand her – laufende Timer werden zu Pausen. */
function restoreGame() {
  const saved = load('game', null);
  if (!saved) return;
  state.screen = saved.screen === 'game' ? 'game' : 'start';
  state.deck = Array.isArray(saved.deck) ? saved.deck : [];
  state.lastCardId = saved.lastCardId ?? null;
  state.round = saved.round ?? null;

  const r = state.round;
  if (!r) return;
  if (!findCard(r.cardId)) {
    // Karte gibt es nicht mehr (z. B. eigene Karte gelöscht).
    state.round = null;
    state.screen = 'start';
    return;
  }
  if (r.phase === 'bid' && r.bids.length > 0) r.pausedMs = bidMs();
  if (r.phase === 'prove' && r.proofState === 'running') r.proofState = 'idle';
}

// ---------- Timer ----------
let lastWholeSecond = null;

const bidTimer = new Countdown({
  onTick(ms) {
    renderTimer(ms);
    // In den letzten 5 Sekunden jede volle Sekunde ticken.
    const s = Math.ceil(ms / 1000);
    if (s !== lastWholeSecond && s > 0 && s <= 5) {
      sounds.tick();
      vibrate(40);
    }
    lastWholeSecond = s;
  },
  onEnd: onBidTimeUp,
});

const proofTimer = new Countdown({
  onTick: renderProofTime,
  onEnd() {
    state.round.proofState = 'done';
    sounds.timeUp();
    vibrate([300, 100, 300]);
    render();
  },
});

function startBidTimer(ms = bidMs()) {
  state.round.pausedMs = null;
  lastWholeSecond = null;
  bidTimer.start(ms);
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
  bidTimer.stop();
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
    phase: 'bid',
    bids: [],
    pausedMs: null,
    proofState: 'idle',
    bidderId: null,
    success: null,
    delta: null,
  };
  state.screen = 'game';
  render();
}

function placeBid(value) {
  state.round.bids.push(value);
  startBidTimer();
  sounds.bid();
  vibrate(25);
  render();
  replayAnimation($('bid-value'), 'bump');
}

/** Erhöht um `steps` Mindestschritte. Das erste Gebot ist immer mindestens der Startwert. */
function raise(steps) {
  const card = currentCard();
  const bid = currentBid();
  const value = bid === null ? card.start + (steps - 1) * card.step : bid + steps * card.step;
  placeBid(value);
}

function undo() {
  const r = state.round;
  if (r.bids.length === 0) return;
  r.bids.pop();
  if (r.bids.length === 0) {
    // Kein Gebot mehr → zurück in den Wartezustand.
    bidTimer.stop();
    r.pausedMs = null;
  }
  sounds.undo();
  render();
}

function togglePause() {
  const r = state.round;
  if (r.bids.length === 0) return;
  if (bidTimer.running) {
    r.pausedMs = bidTimer.remaining();
    bidTimer.stop();
  } else {
    startBidTimer(r.pausedMs ?? bidMs());
  }
  render();
}

/** Pausiert alles, was gerade läuft – z. B. beim Verlassen des Spielbildschirms. */
function pauseRunning() {
  const r = state.round;
  if (!r) return;
  if (bidTimer.running) {
    r.pausedMs = bidTimer.remaining();
    bidTimer.stop();
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

function skipCard() {
  if (state.round.bids.length > 0) return;
  nextCard();
}

function onBidTimeUp() {
  const r = state.round;
  r.phase = 'prove';
  r.proofState = 'idle';
  r.bidderId = null;
  sounds.timeUp();
  vibrate([500, 150, 500, 150, 800]);
  render();
  // Wackel-Animation nur beim echten Ablauf, nicht beim Zurückkehren.
  replayAnimation($('screen-prove'), 'alarm');
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

function startProof() {
  const card = currentCard();
  state.round.proofState = 'running';
  sounds.go();
  vibrate(100);
  proofTimer.start(card.proofSeconds * 1000);
  render();
}

function finishRound(success) {
  proofTimer.stop();
  const r = state.round;
  const card = currentCard();
  r.success = success;
  r.phase = 'result';
  r.delta = null;

  const player = findPlayer(r.bidderId);
  if (player) {
    r.delta = scoreDelta(success, { bid: currentBid(), card });
    player.score += r.delta;
    savePlayers();
  }
  success ? sounds.success() : sounds.fail();
  vibrate(success ? [80, 60, 80] : 400);
  render();
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
  bidTimer.stop();
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

function testFeedback() {
  unlockAudio();
  sounds.timeUp();
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
  const step = readInt('card-step');
  const proof = readInt('card-proof');

  const problem =
    (!text && 'Bitte eine Challenge eingeben.') ||
    (!unit && 'Bitte eine Einheit eingeben (z. B. „Sekunden“).') ||
    ((!Number.isInteger(start) || start < 1) && 'Startwert muss eine ganze Zahl ab 1 sein.') ||
    ((!Number.isInteger(step) || step < 1) && 'Schritt muss eine ganze Zahl ab 1 sein.') ||
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
    step,
  };
  if (proof !== null) card.proofSeconds = proof;
  customCards.push(card);
  save('customCards', customCards);

  $('form-card').reset();
  $('card-category').value = card.category; // Kategorie für die nächste Karte beibehalten
  $('card-error').hidden = true;
  if (!settings.categories.includes(card.category)) {
    toast('Gespeichert – Kategorie ist aber gerade ausgeschaltet.');
  } else {
    toast('Karte gespeichert!');
  }
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
let resumeAfterDialogMs = null;

function openBidDialog() {
  const card = currentCard();
  // Während getippt wird, darf der Timer nicht ablaufen.
  resumeAfterDialogMs = bidTimer.running ? bidTimer.remaining() : null;
  bidTimer.stop();
  const input = $('input-bid');
  input.min = minNextBid(card);
  input.value = minNextBid(card);
  $('bid-error').hidden = true;
  $('dlg-bid').showModal();
  input.select();
}

function closeBidDialog(submitted) {
  $('dlg-bid').close();
  if (!submitted && resumeAfterDialogMs !== null) startBidTimer(resumeAfterDialogMs);
  resumeAfterDialogMs = null;
  render();
}

function submitBidDialog(event) {
  event.preventDefault();
  const card = currentCard();
  const value = Number($('input-bid').value);
  const min = minNextBid(card);
  if (!Number.isInteger(value) || value < min) {
    $('bid-error').textContent = `Mindestens ${min} ${card.unit}.`;
    $('bid-error').hidden = false;
    return;
  }
  closeBidDialog(true);
  placeBid(value);
}

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
  if (phase === 'bid') renderBid();
  if (phase === 'prove') renderProve();
  if (phase === 'result') renderResult();
  showScreen(`screen-${phase}`);
}

function renderStart() {
  $('btn-start').textContent = state.round ? 'Weiterspielen' : "Los geht's";
  $('btn-scores-start').hidden = players.length === 0;
  $('players-count').textContent = players.length ? `(${players.length})` : '– optional';

  const list = $('players-list');
  list.replaceChildren(
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
        el('span', { className: 'emoji', text: cat.emoji }),
        el('span', { text: cat.name }),
        el('small', { text: `${count} Karten` }),
      ]);
      b.addEventListener('click', () => toggleCategory(cat.id));
      return b;
    }),
  );
}

function renderSettings() {
  $('timer-setting').textContent = `${settings.timerSeconds} s`;
  $('btn-timer-down').disabled = settings.timerSeconds <= TIMER_MIN;
  $('btn-timer-up').disabled = settings.timerSeconds >= TIMER_MAX;
  $('toggle-sound').checked = settings.sound;
  $('toggle-vibration').checked = settings.vibration;
  $('vibration-note').hidden = 'vibrate' in navigator;
}

function renderCards() {
  const select = $('card-category');
  if (select.options.length === 0) {
    CATEGORIES.forEach((c) => select.append(el('option', { text: `${c.emoji} ${c.name}`, attrs: { value: c.id } })));
  }
  $('custom-count').textContent = customCards.length ? `(${customCards.length})` : '';
  $('custom-empty').hidden = customCards.length > 0;
  $('custom-list').replaceChildren(
    ...customCards.map((card) => {
      const meta = [categoryLabel(card.category), `ab ${card.start} ${card.unit}`, `+${card.step}`];
      if (card.proofSeconds) meta.push(`${card.proofSeconds} s Beweis`);
      const del = el('button', { className: 'icon-btn', text: '🗑', attrs: { type: 'button', 'aria-label': 'Karte löschen' } });
      del.addEventListener('click', () => deleteCustomCard(card.id));
      return el('li', {}, [
        el('div', { className: 'info' }, [
          el('div', { className: 'text', text: card.text }),
          el('div', { className: 'meta', text: meta.join(' · ') }),
        ]),
        del,
      ]);
    }),
  );
}

function renderBid() {
  const card = currentCard();
  const bid = currentBid();
  const waiting = bid === null;

  $('bid-category').textContent = categoryLabel(card.category);
  $('bid-card').textContent = card.text;
  $('btn-scores').hidden = players.length === 0;

  const value = String(waiting ? card.start : bid);
  const valueEl = $('bid-value');
  valueEl.textContent = value;
  valueEl.classList.toggle('len-3', value.length === 3);
  valueEl.classList.toggle('len-4', value.length >= 4);
  $('bid-label').textContent = waiting ? 'Startgebot' : 'Höchstgebot';
  $('bid-unit').textContent = card.unit;
  $('bid-display').classList.toggle('is-waiting', waiting);

  $('btn-undo').disabled = waiting;
  $('btn-plus5').textContent = `+${5 * card.step}`;
  // Nur unsichtbar machen statt entfernen: Der Platz bleibt reserviert, sonst
  // rutscht der Plus-Button nach dem ersten Gebot unter dem Finger weg.
  $('btn-skip').classList.toggle('invisible', !waiting);
  $('btn-skip').disabled = !waiting;

  renderTimer(bidTimer.running ? bidTimer.remaining() : state.round.pausedMs ?? bidMs());
}

function renderTimer(ms) {
  const r = state.round;
  if (!r || r.phase !== 'bid') return;
  const waiting = r.bids.length === 0;
  const paused = !waiting && !bidTimer.running;
  const seconds = Math.ceil(ms / 1000);

  const timer = $('timer');
  timer.classList.toggle('is-waiting', waiting);
  timer.classList.toggle('is-paused', paused);
  timer.classList.toggle('is-urgent', bidTimer.running && seconds <= 5);
  $('timer-value').textContent = seconds;
  $('timer-fill').style.transform = `scaleX(${Math.min(1, ms / bidMs())})`;
  $('timer-caption').textContent = waiting
    ? 'Startet mit dem ersten Gebot'
    : paused
      ? 'Pausiert – tippen zum Weitermachen'
      : 'Tippen zum Pausieren';
}

function renderProve() {
  const card = currentCard();
  const r = state.round;
  // Wurde der gewählte Bieter inzwischen gelöscht? Dann neu wählen.
  if (r.bidderId && r.bidderId !== NO_SCORE && !findPlayer(r.bidderId)) r.bidderId = null;

  $('prove-value').textContent = currentBid();
  $('prove-unit').textContent = card.unit;
  $('prove-card').textContent = card.text;

  const needPick = players.length > 0 && r.bidderId === null;
  $('prove-bidder').hidden = !needPick;
  if (needPick) {
    $('bidder-buttons').replaceChildren(
      ...players.map((p) => {
        const b = el('button', { className: 'btn btn-ghost', text: p.name, attrs: { type: 'button' } });
        b.addEventListener('click', () => chooseBidder(p.id));
        return b;
      }),
    );
  }

  const who = $('prove-who');
  who.hidden = players.length === 0 || needPick;
  const bidder = findPlayer(r.bidderId);
  who.textContent = bidder ? `🎤 ${bidder.name} muss liefern` : 'Ohne Wertung · ändern';

  const hasProofTimer = Boolean(card.proofSeconds);
  $('proof-timer').hidden = needPick || !hasProofTimer;
  if (hasProofTimer) {
    $('btn-proof-start').hidden = r.proofState !== 'idle';
    renderProofTime(r.proofState === 'running' ? proofTimer.remaining() : card.proofSeconds * 1000);
  }
  $('verdict').hidden = needPick;
}

function renderProofTime(ms) {
  const r = state.round;
  const box = $('proof-time');
  const done = r.proofState === 'done';
  const seconds = Math.ceil(ms / 1000);
  box.textContent = done ? 'Zeit um!' : `${seconds} s`;
  box.classList.toggle('is-done', done);
  box.classList.toggle('is-urgent', r.proofState === 'running' && seconds <= 5);
}

function renderResult() {
  const card = currentCard();
  const r = state.round;
  $('result-icon').textContent = r.success ? '🏆' : '💥';
  const title = $('result-title');
  title.textContent = r.success ? 'Geschafft!' : 'Nicht geschafft!';
  title.className = `result-title ${r.success ? 'win' : 'lose'}`;
  $('result-detail').textContent = `${currentBid()} ${card.unit}`;

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
        el('span', { className: 'rank', text: rank === 1 ? '👑' : `${rank}.` }),
        el('span', { className: 'name', text: p.name }),
        el('span', { className: 'score', text: p.score }),
      ]);
    }),
  );
}

// ---------- Events verbinden ----------
function bindEvents() {
  // Audio darf erst nach einer Nutzeraktion starten.
  document.addEventListener('pointerdown', unlockAudio);

  $('btn-start').addEventListener('click', startGame);
  $('btn-home').addEventListener('click', goHome);
  $('btn-plus').addEventListener('click', () => raise(1));
  $('btn-plus5').addEventListener('click', () => raise(5));
  $('btn-undo').addEventListener('click', undo);
  $('btn-skip').addEventListener('click', skipCard);
  $('timer').addEventListener('click', togglePause);
  $('bid-display').addEventListener('click', openBidDialog);
  $('btn-no-score').addEventListener('click', () => chooseBidder(NO_SCORE));
  $('prove-who').addEventListener('click', changeBidder);
  $('btn-proof-start').addEventListener('click', startProof);
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
  $('toggle-sound').addEventListener('change', (e) => setToggle('sound', e.target.checked));
  $('toggle-vibration').addEventListener('change', (e) => setToggle('vibration', e.target.checked));
  $('btn-test-sound').addEventListener('click', testFeedback);
  $('form-card').addEventListener('submit', addCustomCard);
  $('btn-confirm-ok').addEventListener('click', () => {
    $('dlg-confirm').close();
    onConfirm?.();
    onConfirm = null;
  });

  $('form-bid').addEventListener('submit', submitBidDialog);
  $('dlg-bid').querySelector('[data-close]').addEventListener('click', () => closeBidDialog(false));
  // Esc-Taste / Zurück-Geste schließt den Dialog ebenfalls.
  $('dlg-bid').addEventListener('cancel', (e) => {
    e.preventDefault();
    closeBidDialog(false);
  });
  // Alle anderen Dialoge: [data-close]-Buttons schließen einfach.
  ['dlg-scores', 'dlg-confirm'].forEach((id) => {
    $(id).querySelector('[data-close]').addEventListener('click', () => $(id).close());
  });
}

setSoundEnabled(settings.sound);
setVibrationEnabled(settings.vibration);
restoreGame();
bindEvents();
render();
