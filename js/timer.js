// Countdown, der mit Zeitstempeln rechnet statt Sekunden mitzuzählen.
// Dadurch stimmt die Restzeit auch, wenn der Browser Intervalle drosselt
// (Hintergrund-Tab, langsames Handy).

export class Countdown {
  /**
   * @param {object} handlers
   * @param {(msLeft:number)=>void} handlers.onTick  ca. 10× pro Sekunde
   * @param {()=>void} handlers.onEnd                genau einmal bei 0
   */
  constructor({ onTick, onEnd }) {
    this.onTick = onTick;
    this.onEnd = onEnd;
    this.endsAt = null; // Zeitpunkt (ms seit 1970), an dem der Timer abläuft
    this.intervalId = null;
  }

  get running() {
    return this.endsAt !== null;
  }

  remaining() {
    return this.running ? Math.max(0, this.endsAt - Date.now()) : 0;
  }

  start(ms) {
    this.endsAt = Date.now() + ms;
    if (this.intervalId === null) {
      this.intervalId = setInterval(() => this.tick(), 100);
    }
    this.tick();
  }

  stop() {
    this.endsAt = null;
    clearInterval(this.intervalId);
    this.intervalId = null;
  }

  tick() {
    const left = this.remaining();
    this.onTick(left);
    if (left <= 0) {
      this.stop();
      this.onEnd();
    }
  }
}
