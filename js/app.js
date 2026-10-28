// Einstiegspunkt: hält den Spielzustand, verbindet Buttons mit Aktionen
// und zeichnet den jeweils sichtbaren Bildschirm.
//
// Grundprinzip: Ein Event-Handler ändert `state` und ruft dann render() auf.
// render() liest nur aus `state` und passt das HTML an.

import { DEFAULT_CARDS, CATEGORIES } from './cards.js';
import { drawCard } from './deck.js';
import { Countdown } from './timer.js';
import { sounds, unlockAudio } from './sound.js';
import { vibrate } from './feedback.js';

const BID_SECONDS = 15;

// ---------- Zustand ----------
const state = {
  screen: 'start', // 'start' | 'game'
  deck: [], // noch nicht gespielte Karten-IDs
  lastCardId: null,
  // Die laufende Runde (oder null):
  // { cardId, phase: 'bid'|'prove'|'result', bids: [], pausedMs: null|Zahl,
  //   proofState: 'idle'|'running'|'done', success: null|true|false }
  round: null,
};

// ---------- Hilfsfunktionen ----------
const $ = (id) => document.getElementById(id);

function allCards() {
  return DEFAULT_CARDS;
}

function currentCard() {
  return state.round && allCards().find((c) => c.id === state.round.cardId);
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

function categoryLabel(id) {
  const cat = CATEGORIES.find((c) => c.id === id);
  return cat ? `${cat.emoji} ${cat.name}` : id;
}

let toastTimeout = null;
function toast(message) {
  const el = $('toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => el.classList.remove('show'), 2600);
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

function startBidTimer(ms = BID_SECONDS * 1000) {
  state.round.pausedMs = null;
  lastWholeSecond = null;
  bidTimer.start(ms);
}

// ---------- Aktionen ----------
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
  const result = drawCard(state.deck, allCards(), state.lastCardId);
  if (!result.card) {
    state.round = null;
    state.screen = 'start';
    toast('Keine Karten verfügbar.');
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
    success: null,
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
  // Animation neu auslösen: Klasse entfernen, Reflow erzwingen, wieder setzen.
  const el = $('bid-value');
  el.classList.remove('bump');
  void el.offsetWidth;
  el.classList.add('bump');
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
    startBidTimer(r.pausedMs ?? BID_SECONDS * 1000);
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
  sounds.timeUp();
  vibrate([500, 150, 500, 150, 800]);
  render();
  // Wackel-Animation nur beim echten Ablauf, nicht beim Zurückkehren.
  const screen = $('screen-prove');
  screen.classList.remove('alarm');
  void screen.offsetWidth;
  screen.classList.add('alarm');
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
  r.success = success;
  r.phase = 'result';
  success ? sounds.success() : sounds.fail();
  vibrate(success ? [80, 60, 80] : 400);
  render();
}

// ---------- Direkteingabe ----------
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
    const err = $('bid-error');
    err.textContent = `Mindestens ${min} ${card.unit}.`;
    err.hidden = false;
    return;
  }
  closeBidDialog(true);
  placeBid(value);
}

// ---------- Darstellung ----------
function showScreen(id) {
  document.querySelectorAll('.screen').forEach((el) => {
    el.classList.toggle('active', el.id === id);
  });
}

function render() {
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
}

function renderBid() {
  const card = currentCard();
  const bid = currentBid();
  const waiting = bid === null;

  $('bid-category').textContent = categoryLabel(card.category);
  $('bid-card').textContent = card.text;

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

  renderTimer(bidTimer.running ? bidTimer.remaining() : state.round.pausedMs ?? BID_SECONDS * 1000);
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
  $('timer-fill').style.transform = `scaleX(${ms / (BID_SECONDS * 1000)})`;
  $('timer-caption').textContent = waiting
    ? 'Startet mit dem ersten Gebot'
    : paused
      ? 'Pausiert – tippen zum Weitermachen'
      : 'Tippen zum Pausieren';
}

function renderProve() {
  const card = currentCard();
  const r = state.round;
  $('prove-value').textContent = currentBid();
  $('prove-unit').textContent = card.unit;
  $('prove-card').textContent = card.text;

  const hasProofTimer = Boolean(card.proofSeconds);
  $('proof-timer').hidden = !hasProofTimer;
  if (hasProofTimer) {
    $('btn-proof-start').hidden = r.proofState !== 'idle';
    renderProofTime(r.proofState === 'running' ? proofTimer.remaining() : card.proofSeconds * 1000);
  }
}

function renderProofTime(ms) {
  const r = state.round;
  const el = $('proof-time');
  const done = r.proofState === 'done';
  const seconds = Math.ceil(ms / 1000);
  el.textContent = done ? 'Zeit um!' : `${seconds} s`;
  el.classList.toggle('is-done', done);
  el.classList.toggle('is-urgent', r.proofState === 'running' && seconds <= 5);
}

function renderResult() {
  const card = currentCard();
  const r = state.round;
  $('result-icon').textContent = r.success ? '🏆' : '💥';
  const title = $('result-title');
  title.textContent = r.success ? 'Geschafft!' : 'Nicht geschafft!';
  title.className = `result-title ${r.success ? 'win' : 'lose'}`;
  $('result-detail').textContent = `${currentBid()} ${card.unit}`;
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
  $('btn-proof-start').addEventListener('click', startProof);
  $('btn-success').addEventListener('click', () => finishRound(true));
  $('btn-fail').addEventListener('click', () => finishRound(false));
  $('btn-next').addEventListener('click', nextCard);

  $('form-bid').addEventListener('submit', submitBidDialog);
  $('dlg-bid').querySelector('[data-close]').addEventListener('click', () => closeBidDialog(false));
  // Esc-Taste / Zurück-Geste schließt den Dialog ebenfalls.
  $('dlg-bid').addEventListener('cancel', (e) => {
    e.preventDefault();
    closeBidDialog(false);
  });
}

bindEvents();
render();
