/**
 * Music Engine. Plays a per-step ambient loop defined in theme.json `music`.
 * Fully optional and offline: if a track is missing or blocked, it fails silently
 * and never interrupts the flow. Cross-fades between steps.
 */
export class MusicEngine {
  constructor(config) {
    this.config = config;
    this.map = (config.theme.music && config.theme.music.steps) || {};
    this.volume = config.theme.music?.volume ?? 0.5;
    this.current = null;
    this.currentKey = null;
  }

  async onStep(step) {
    const rel = this.map[step];
    if (rel === this.currentKey) return; // same track keeps playing
    this.currentKey = rel;
    this._fadeOut(this.current);
    this.current = null;
    if (!rel) return;
    try {
      const url = await this.config.asset(rel);
      const audio = new Audio(url);
      audio.loop = true;
      audio.volume = 0;
      await audio.play();
      this._fadeIn(audio);
      this.current = audio;
    } catch (_) { /* autoplay blocked or file missing — stay silent */ }
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
