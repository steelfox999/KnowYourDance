import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { CheckCircle2, Home, QrCode } from 'lucide-react';
import qrcode from '../../vendor/qrcode-generator.mjs';
import GlassCard from '../components/GlassCard';
import { isOnline } from '../core/platform.js';

export default function QrScreen({ config, onReset }) {
  const qrCfg = config.experience?.qr || {};
  const online = isOnline();
  const enabled = qrCfg.enabled !== false && !!qrCfg.deliveryBaseUrl;
  const [qrSvg, setQrSvg] = useState(null);
  const [timeLeft, setTimeLeft] = useState(qrCfg.autoResetSeconds || 20);
  const containerRef = useRef(null);

  useEffect(() => {
    gsap.fromTo(
      containerRef.current,
      { opacity: 0, y: 18 },
      { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }
    );

    if (enabled && online) {
      const token = Math.random().toString(36).slice(2, 10);
      const url = `${qrCfg.deliveryBaseUrl.replace(/\/$/, '')}/${token}`;
      const qr = qrcode(0, 'M');
      qr.addData(url);
      qr.make();
      setQrSvg(qr.createSvgTag(6, 2));

      gsap.fromTo(
        '.qr-code-box',
        { scale: 0.98, opacity: 0.92 },
        { scale: 1.02, opacity: 1, duration: 2.2, repeat: -1, yoyo: true, ease: 'sine.inOut' }
      );
    }
  }, [enabled, online, qrCfg.deliveryBaseUrl]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onReset();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onReset]);

  const maxSeconds = qrCfg.autoResetSeconds || 20;
  const countdownPct = (timeLeft / maxSeconds) * 100;

  return (
    <section ref={containerRef} className="view-screen active">
      <GlassCard className="glass-card-sm qr-card">
        {enabled && online && qrSvg ? (
          <>
            <div className="card-header">
              <span>Digital Delivery</span>
              <p>Scan with your mobile camera to download the high-resolution portrait.</p>
            </div>
            <h2 className="print-title font-serif text-gradient-gold">Take It Home</h2>
            <div className="qr-code-box" dangerouslySetInnerHTML={{ __html: qrSvg }} />
          </>
        ) : (
          <>
            <div className="complete-icon">
              {online ? <CheckCircle2 size={42} strokeWidth={1.5} /> : <QrCode size={42} strokeWidth={1.5} />}
            </div>
            <h2 className="print-title font-serif text-gradient-gold">Experience Complete</h2>
            <p className="completion-copy">
              {online
                ? 'Thank you for exploring Know Your Dance. Please collect your printed keepsake sheet.'
                : 'Digital copies are offline right now. Please collect your printed keepsake sheet from the tray.'}
            </p>
          </>
        )}

        <button type="button" onClick={onReset} className="btn-royal qr-reset">
          <Home size={18} />
          <span>Finish & Reset Kiosk</span>
        </button>

        <div className="countdown-track">
          <div className="countdown-fill" style={{ width: `${countdownPct}%` }} />
        </div>
        <span className="countdown-copy">Auto reset in {timeLeft}s</span>
      </GlassCard>
    </section>
  );
}
