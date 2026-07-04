import { screen, el, enter } from '../core/ui.js';

/** Attract loop. Any tap begins the experience. */
export default {
  render(stage, session, engine) {
    const cfg = engine.config;
    const images = cfg.resolved.idleImages || [];
    const idleCfg = cfg.theme.idle || {};

    const bg = el('div', { class: 'idle-bg' });
    const view = screen('screen-idle', [
      bg,
      el('div', { class: 'idle-overlay' }, [
        el('h1', { class: 'idle-title', text: idleCfg.title || cfg.experience.name }),
        el('p', { class: 'idle-tagline', text: idleCfg.tagline || 'Touch to begin your story' }),
        el('div', { class: 'idle-pulse' }),
      ]),
    ]);
    stage.appendChild(enter(view));

    let i = 0;
    const setImg = () => {
      if (images.length) bg.style.backgroundImage = `url("${images[i % images.length]}")`;
      i++;
    };
    setImg();
    const timer = images.length > 1 ? setInterval(setImg, idleCfg.intervalMs || 4000) : null;

    const begin = () => engine.next();
    view.addEventListener('pointerdown', begin);

    return () => {
      if (timer) clearInterval(timer);
      view.removeEventListener('pointerdown', begin);
    };
  },
};
