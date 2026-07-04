import { screen, el, primaryButton, enter } from '../core/ui.js';

/** Narrative setup: plays story beats, then advances to the quiz. */
export default {
  render(stage, session, engine) {
    const beats = engine.config.story.beats;
    let idx = 0;

    const beatText = el('p', { class: 'story-text' });
    const dots = el('div', { class: 'story-dots' },
      beats.map((_, i) => el('span', { class: 'dot', 'data-i': i })));

    const next = primaryButton('Continue', () => {
      idx++;
      if (idx >= beats.length) return engine.next();
      show();
    });

    function show() {
      beatText.classList.remove('enter-active');
      requestAnimationFrame(() => {
        beatText.textContent = beats[idx].text;
        beatText.classList.add('enter', 'enter-active');
        dots.querySelectorAll('.dot').forEach((d, i) =>
          d.classList.toggle('active', i === idx));
        next.textContent = idx === beats.length - 1 ? 'Begin the trial' : 'Continue';
      });
    }

    const view = screen('screen-story', [
      el('div', { class: 'story-frame' }, [beatText, dots, next]),
    ]);
    stage.appendChild(enter(view));
    show();
  },
};
