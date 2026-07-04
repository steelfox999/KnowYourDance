import { screen, el, primaryButton, ghostButton, enter } from '../core/ui.js';

/** Shows configured transformation outputs, then routes to print. */
export default {
  render(stage, session, engine) {
    const o = session.outputs;
    const print = engine.config.print || {};
    const labels = print.labels || {};
    const order = (print.order || ['original', 'mask', 'costume', 'combined']).filter((key) => o[key]);
    const tiles = order.map((key) =>
      el('figure', { class: 'result-tile' }, [
        el('img', { src: o[key], alt: labels[key] || key }),
        el('figcaption', { text: labels[key] || key }),
      ])
    );

    const view = screen('screen-results', [
      el('div', { class: 'results-frame' }, [
        el('h2', { class: 'results-title', text: `You are ${session.character.name}` }),
        el('div', { class: 'results-grid' }, tiles),
        el('div', { class: 'results-actions' }, [
          ghostButton('Start over', () => engine.reset()),
          primaryButton('Print my sheet', () => engine.next()),
        ]),
      ]),
    ]);
    stage.appendChild(enter(view));
  },
};
