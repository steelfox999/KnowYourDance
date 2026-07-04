import { screen, el, primaryButton, enter } from '../core/ui.js';
import { runReveal } from './selection.js';

/**
 * Reveal: assign a character and — mandatory in every experience — explain why
 * that character chose THIS visitor based on their quiz answers.
 */
export default {
  render(stage, session, engine) {
    const { character, revealText, ranked } = runReveal(engine.config.characters, session.answers);
    session.character = character;
    session.revealText = revealText;
    session.traitRanking = ranked;

    const portrait = el('div', { class: 'reveal-portrait' });
    engine.config.asset(character.portrait || '').then((url) => {
      if (character.portrait) portrait.style.backgroundImage = `url("${url}")`;
    });

    const topTraits = ranked.slice(0, 3).map((r) =>
      el('span', { class: 'trait-chip', text: r.trait }));

    const view = screen('screen-reveal', [
      el('div', { class: 'reveal-frame' }, [
        el('p', { class: 'reveal-eyebrow', text: 'You have been chosen' }),
        portrait,
        el('h2', { class: 'reveal-name', text: character.name }),
        character.title ? el('p', { class: 'reveal-title', text: character.title }) : null,
        el('div', { class: 'reveal-why' }, [
          el('p', { class: 'reveal-why-label', text: 'Why they chose you' }),
          el('p', { class: 'reveal-why-text', text: revealText }),
        ]),
        el('div', { class: 'reveal-traits' }, topTraits),
        primaryButton('Take my portrait', () => engine.next()),
      ]),
    ]);
    stage.appendChild(enter(view));
  },
};
