export class Timer {
  constructor(onTick) {
    this.onTick = onTick;

    this._startedAt = null;
    this._elapsed = 0;
    this._raf = null;
    this._running = false;
  }

  start() {
    if (this._running) {
      return;
    }

    this._running = true;
    this._startedAt = performance.now() - this._elapsed;

    this._loop();
  }

  stop() {
    if (!this._running) {
      return;
    }

    this._elapsed = performance.now() - this._startedAt;
    this._running = false;

    if (this._raf) {
      cancelAnimationFrame(this._raf);
      this._raf = null;
    }

    this._emit();
  }

  reset() {
    this._running = false;
    this._elapsed = 0;
    this._startedAt = null;

    if (this._raf) {
      cancelAnimationFrame(this._raf);
      this._raf = null;
    }

    this._emit();
  }

  isRunning() {
    return this._running;
  }

  getElapsedMs() {
    return this._running
      ? performance.now() - this._startedAt
      : this._elapsed;
  }

  _loop() {
    if (!this._running) {
      return;
    }

    this._emit();

    this._raf = requestAnimationFrame(() => {
      this._loop();
    });
  }

  _emit() {
    const ms = this.getElapsedMs();

    this.onTick?.(ms, Timer.format(ms));
  }

  static format(ms) {
    const totalCentis = Math.floor(ms / 10);
    const centis = totalCentis % 100;
    const totalSeconds = Math.floor(totalCentis / 100);
    const seconds = totalSeconds % 60;
    const minutes = Math.floor(totalSeconds / 60);

    const pad = (n) => String(n).padStart(2, '0');

    return `${pad(minutes)}:${pad(seconds)}.${pad(centis)}`;
  }
}