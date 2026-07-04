import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { Maximize2, Printer, RotateCcw, X } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import { getDanceProfile } from './dance-profiles.js';

export default function ResultsScreen({ config, session, onNext, onReset }) {
  const outputs = session.outputs || {};
  const print = config.print || {};
  const labels = print.labels || {};
  const order = (print.order || ['original', 'mask', 'costume', 'combined']).filter((key) => outputs[key]);
  const [activeModalImage, setActiveModalImage] = useState(null);
  const containerRef = useRef(null);
  const profile = getDanceProfile(session.character?.id);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const timeline = gsap.timeline({ defaults: { ease: 'expo.out' } });
      timeline
        .fromTo('.results-header', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.8, clearProps: 'all' })
        .fromTo('.result-tile', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, clearProps: 'all' }, '-=0.35')
        .fromTo('.results-actions', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, clearProps: 'all' }, '-=0.25');
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={containerRef} className="view-screen active">
      <GlassCard className="glass-card-lg results-card" showCorners={false}>
        <div className="results-header reveal-header">
          <div className="tag-pill">Transformation Complete</div>
          <h2 className="font-serif">You Are</h2>
          <h3 className="text-gradient-gold">{session.character?.name || 'Chosen'}</h3>
          <p>{profile.subtitle}</p>
        </div>

        <div className="results-layout">
          <div className="result-gallery">
            {order.map((key) => (
              <button
                type="button"
                key={key}
                className="result-tile"
                onClick={() => setActiveModalImage({ src: outputs[key], label: labels[key] || key })}
              >
                <span className="result-image-wrap">
                  <img src={outputs[key]} alt={labels[key] || key} />
                  <span className="result-expand">
                    <Maximize2 size={20} />
                  </span>
                </span>
                <span className="result-label">{labels[key] || key}</span>
              </button>
            ))}
          </div>

          <div className="results-info">
            <div className="info-card">
              <h4>Your Museum Portrait</h4>
              <p>{session.revealText}</p>
            </div>

            <div className="attributes-grid">
              <div className="attr-card">
                <span>Region of Origin</span>
                <p>{profile.region}</p>
              </div>
              <div className="attr-card">
                <span>Mask Materials</span>
                <p>{profile.materials}</p>
              </div>
              <div className="attr-card">
                <span>Musical Rhythm</span>
                <p>{profile.instruments}</p>
              </div>
            </div>

            <div className="results-actions">
              <button type="button" onClick={onReset} className="btn-outline">
                <RotateCcw size={18} />
                <span>Start Over</span>
              </button>
              <button type="button" onClick={onNext} className="btn-royal">
                <Printer size={18} />
                <span>Print Keepsake</span>
              </button>
            </div>
          </div>
        </div>
      </GlassCard>

      {activeModalImage && (
        <div className="image-modal" onClick={() => setActiveModalImage(null)}>
          <div className="image-modal-content" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="image-modal-close" onClick={() => setActiveModalImage(null)}>
              <X size={22} />
            </button>
            <span>{activeModalImage.label}</span>
            <img src={activeModalImage.src} alt={activeModalImage.label} />
          </div>
        </div>
      )}
    </section>
  );
}
