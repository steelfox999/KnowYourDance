/**
 * Flow Engine — the heart of the platform.
 *
 * It sequences the visitor journey and owns the per-visit `session`. It knows
 * NOTHING about specific masks, dance forms, or any theme. Each step is a module that renders
 * into the stage and calls engine.next()/engine.reset() when done. The order of
 * steps comes from the Experience config, not from code.
 */
export const STEPS = {
  IDLE: 'idle',
  STORY: 'story',
  QUIZ: 'quiz',
  REVEAL: 'reveal',
  CAMERA: 'camera',
  TRANSFORM: 'transform',
  RESULTS: 'results',
  PRINT: 'print',
  QR: 'qr',
};

export class Engine {
  constructor({ stage, config, modules }) {
    this.stage = stage;
    this.config = config;
    this.modules = modules; // { idle, story, quiz, reveal, camera, transform, results, print, qr }
    this.flow = config.experience.flow || [
      STEPS.IDLE, STEPS.STORY, STEPS.QUIZ, STEPS.REVEAL,
      STEPS.CAMERA, STEPS.TRANSFORM, STEPS.RESULTS, STEPS.PRINT, STEPS.QR,
    ];
    this.index = 0;
    this._cleanup = null;
    this.session = this._freshSession();
    this._idleTimer = null;
  }

  _freshSession() {
    return {
      startedAt: null,
      answers: [],        // [{ questionId, optionIndex, traits }]
      traitScores: {},    // accumulated trait -> score
      character: null,    // chosen character object
      revealText: null,   // resolved "why this character chose you"
      photo: null,        // dataURL of captured original
      outputs: null,      // keyed output dataURLs, e.g. { original, mask }
    };
  }

  start() {
    this.index = 0;
    this._render();
  }

  /** Advance to the next step in the flow. */
  next() {
    this.index = Math.min(this.index + 1, this.flow.length - 1);
    this._render();
  }

  /** Jump to a named step (e.g. results -> print). */
  goTo(step) {
    const i = this.flow.indexOf(step);
    if (i >= 0) this.index = i;
    this._render();
  }

  /** Return to idle and wipe the session (also fires on inactivity timeout). */
  reset() {
    this.session = this._freshSession();
    this.index = this.flow.indexOf(STEPS.IDLE);
    if (this.index < 0) this.index = 0;
    this._render();
  }

  currentStep() {
    return this.flow[this.index];
  }

  _render() {
    if (this._cleanup) { try { this._cleanup(); } catch (_) {} this._cleanup = null; }
    this._clearIdleTimer();

    const step = this.currentStep();
    const mod = this.modules[step];
    this.stage.innerHTML = '';
    this.stage.dataset.step = step;

    if (step !== STEPS.IDLE) {
      this.session.startedAt = this.session.startedAt || Date.now();
      this._armIdleTimer();
    }

    if (typeof this.onStep === 'function') {
      try { this.onStep(step, this.session); } catch (_) {}
    }

    if (!mod) {
      this.stage.textContent = `No module registered for step "${step}"`;
      return;
    }
    // Each module returns an optional cleanup function.
    this._cleanup = mod.render(this.stage, this.session, this) || null;
  }

  /* Inactivity: if a visitor walks away mid-flow, return to idle. */
  _armIdleTimer() {
    const ms = (this.config.experience.idleTimeoutSeconds || 90) * 1000;
    const bump = () => { this._clearIdleTimer(); this._idleTimer = setTimeout(() => this.reset(), ms); };
    this._bump = bump;
    ['pointerdown', 'keydown', 'touchstart'].forEach((ev) =>
      this.stage.addEventListener(ev, bump, { passive: true })
    );
    bump();
  }

  _clearIdleTimer() {
    if (this._idleTimer) clearTimeout(this._idleTimer);
    this._idleTimer = null;
    if (this._bump) {
      ['pointerdown', 'keydown', 'touchstart'].forEach((ev) =>
        this.stage.removeEventListener(ev, this._bump)
      );
    }
  }
}
