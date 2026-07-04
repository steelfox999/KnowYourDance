import { screen, el, enter } from '../core/ui.js';
import { CompositingProvider } from './transform-provider.js';

/**
 * Runs the transform provider to turn the single captured photo into configured outputs,
 * then advances to results. Provider is selected from config so it can be swapped
 * for a generative one later without touching this screen.
 */
const PROVIDERS = { compositing: CompositingProvider };

export default {
  render(stage, session, engine) {
    const cfg = engine.config;
    const bar = el('div', { class: 'xform-bar-fill' });
    const label = el('p', { class: 'xform-label', text: 'Summoning your transformation…' });

    const view = screen('screen-transform', [
      el('div', { class: 'xform-frame' }, [
        el('div', { class: 'xform-spinner' }),
        label,
        el('div', { class: 'xform-bar' }, [bar]),
      ]),
    ]);
    stage.appendChild(enter(view));

    const providerName = cfg.prompts.provider || 'compositing';
    const Provider = PROVIDERS[providerName] || CompositingProvider;
    const provider = new Provider();

    // Resolve the prompt set for the chosen character (fallback to default).
    const setId = session.character.promptSet || session.character.id;
    const promptSet = cfg.prompts.sets[setId] || cfg.prompts.sets[cfg.prompts.default];

    let pct = 0;
    const tick = setInterval(() => {
      pct = Math.min(pct + 7, 92);
      bar.style.width = pct + '%';
    }, 90);

    (async () => {
      try {
        const resolveAsset = (rel) => cfg.asset(rel);
        const outputs = await provider.transform(session.photo, promptSet, resolveAsset);
        session.outputs = outputs;
        bar.style.width = '100%';
        clearInterval(tick);
        setTimeout(() => engine.next(), 350);
      } catch (err) {
        clearInterval(tick);
        label.textContent = 'Transformation failed: ' + err.message;
        console.error(err);
      }
    })();

    return () => clearInterval(tick);
  },
};
