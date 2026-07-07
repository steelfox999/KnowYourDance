/**
 * Music Engine. Plays a per-step ambient loop defined in theme.json `music`.
 * Fully optional and offline: if a track is missing or blocked, it fails silently
 * and never interrupts the flow. Cross-fades between steps.
 */
export class MusicEngine {
  constructor(config) {
    this.config = config;
    const music = config.theme.music || {};
    this.map = music.steps || {};
    this.defaultTrack = music.track || null;
    this.volume = music.volume ?? 0.5;
    this.current = null;
    this.currentKey = null;
  }

  async onStep(step) {
    const rel = this.map[step] || this.defaultTrack;
    if (rel === this.currentKey && this.current && !this.current.paused) return; // same track keeps playing

    if (rel !== this.currentKey) {
      this._fadeOut(this.current);
      this.current = null;
      this.currentKey = null;
    }

    if (!rel) return;
    try {
      const url = this._resolveTrack(rel);
      const audio = new Audio(url);
      audio.loop = true;
      audio.volume = 0;
      await audio.play();
      this._fadeIn(audio);
      this.current = audio;
      this.currentKey = rel;
    } catch (_) { /* autoplay blocked or file missing — stay silent */ }
  }

  _resolveTrack(rel) {
    if (/^(\/|https?:|data:|blob:)/.test(rel)) return rel;
    return this.config.asset(rel);
  }

  _fadeIn(audio) {
    const target = this.volume;
    const id = setInterval(() => {
      audio.volume = Math.min(target, audio.volume + 0.05);
      if (audio.volume >= target) clearInterval(id);
    }, 60);
  }

  _fadeOut(audio) {
    if (!audio) return;
    const id = setInterval(() => {
      audio.volume = Math.max(0, audio.volume - 0.08);
      if (audio.volume <= 0) { clearInterval(id); audio.pause(); }
    }, 60);
  }
}
