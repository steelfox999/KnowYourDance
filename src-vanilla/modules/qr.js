import { screen, el, primaryButton, enter } from '../core/ui.js';
import { isOnline } from '../core/platform.js';
import qrcode from '../../vendor/qrcode-generator.mjs';

/**
 * QR / digital-copy step. Per the offline-first rule this is a strictly ADDITIVE
 * bonus: when there is no connection (or no delivery URL configured) it degrades
 * to a clear "unavailable" message and never blocks the reset. The QR itself is
 * rendered on-device, so no internet is needed to DRAW it — only the link target
 * requires connectivity to work.
 */
export default {
  render(stage, session, engine) {
    const cfg = engine.config.experience;
    const qrCfg = cfg.qr || {};
    const online = isOnline();
    const enabled = qrCfg.enabled !== false && !!qrCfg.deliveryBaseUrl;

    const frame = el('div', { class: 'qr-frame' });

    if (enabled && online) {
      const token = Math.random().toString(36).slice(2, 10);
      const url = `${qrCfg.deliveryBaseUrl.replace(/\/$/, '')}/${token}`;
      const qr = qrcode(0, 'M');
      qr.addData(url);
      qr.make();
      const img = el('div', { class: 'qr-code', html: qr.createSvgTag(6, 2) });
      frame.append(
        el('h2', { class: 'qr-title', text: 'Take it home' }),
        el('p', { class: 'qr-sub', text: 'Scan to download your digital copy' }),
        img
      );
    } else {
      frame.append(
        el('h2', { class: 'qr-title', text: 'Your prints are ready' }),
        el('p', { class: 'qr-sub', text: online
          ? 'Digital delivery is not set up at this venue.'
          : 'Digital copies are offline right now — collect your printed sheet.' })
      );
    }

    frame.append(primaryButton('Finish', () => engine.reset()));

    const view = screen('screen-qr', [frame]);
    stage.appendChild(enter(view));

    // Auto-reset after a short display so the kiosk returns to idle unattended.
    const t = setTimeout(() => engine.reset(), (qrCfg.autoResetSeconds || 20) * 1000);
    return () => clearTimeout(t);
  },
};
