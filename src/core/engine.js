/**
 * Headless Flow Engine.
 * sequences the visitor journey and owns the per-visit `session`.
 * It triggers updates via `onStep` callbacks.
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
  constructor({ config }) {
    this.config = config;
    this.flow = config.experience.flow || [
      STEPS.IDLE, STEPS.STORY, STEPS.QUIZ, STEPS.CAMERA,
      STEPS.REVEAL, STEPS.TRANSFORM, STEPS.RESULTS, STEPS.PRINT, STEPS.QR,
    ];
    this.index = 0;
    this.session = this._freshSession();
    this._idleTimer = null;
    this.onStep = null;
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

  next() {
    this.index = Math.min(this.index + 1, this.flow.length - 1);
    this._render();
  }

  goTo(step) {
    const i = this.flow.indexOf(step);
    if (i >= 0) this.index = i;
    this._render();
  }

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
    this._clearIdleTimer();

    const step = this.currentStep();

    if (step !== STEPS.IDLE) {
      this.session.startedAt = this.session.startedAt || Date.now();
      this._armIdleTimer();
    }

    if (typeof this.onStep === 'function') {
      try { this.onStep(step, this.session); } catch (err) {
        console.error('Error in onStep:', err);
      }
    }
  }

  _armIdleTimer() {
    const ms = (this.config.experience.idleTimeoutSeconds || 90) * 1000;
    const bump = () => { this._clearIdleTimer(); this._idleTimer = setTimeout(() => this.reset(), ms); };
    this._bump = bump;
    ['pointerdown', 'keydown', 'touchstart'].forEach((ev) =>
      window.addEventListener(ev, bump, { passive: true })
    );
    bump();
  }

  _clearIdleTimer() {
    if (this._idleTimer) clearTimeout(this._idleTimer);
    this._idleTimer = null;
    if (this._bump) {
      ['pointerdown', 'keydown', 'touchstart'].forEach((ev) =>
        window.removeEventListener(ev, this._bump)
      );
    }
  }
}
