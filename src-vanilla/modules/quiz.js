import { screen, el, enter } from '../core/ui.js';

/** Light, fun quiz. Each option carries traits that drive character selection. */
export default {
  render(stage, session, engine) {
    const questions = engine.config.quiz.questions;
    let qi = 0;
    session.answers = [];

    const progress = el('div', { class: 'quiz-progress' });
    const promptEl = el('h2', { class: 'quiz-prompt' });
    const optionsEl = el('div', { class: 'quiz-options' });

    function renderQuestion() {
      const q = questions[qi];
      progress.textContent = `Question ${qi + 1} of ${questions.length}`;
      promptEl.textContent = q.prompt;
      optionsEl.innerHTML = '';
      q.options.forEach((opt, oi) => {
        optionsEl.appendChild(
          el('button', {
            class: 'quiz-option',
            type: 'button',
            onClick: () => choose(q, oi),
          }, [
            opt.icon ? el('span', { class: 'quiz-icon', text: opt.icon }) : null,
            el('span', { class: 'quiz-label', text: opt.label }),
          ])
        );
      });
      promptEl.classList.remove('enter-active');
      requestAnimationFrame(() => promptEl.classList.add('enter', 'enter-active'));
    }

    function choose(q, oi) {
      session.answers.push({
        questionId: q.id,
        optionIndex: oi,
        traits: q.options[oi].traits || {},
      });
      qi++;
      if (qi >= questions.length) return engine.next();
      renderQuestion();
    }

    const view = screen('screen-quiz', [
      el('div', { class: 'quiz-frame' }, [progress, promptEl, optionsEl]),
    ]);
    stage.appendChild(enter(view));
    renderQuestion();
  },
};
