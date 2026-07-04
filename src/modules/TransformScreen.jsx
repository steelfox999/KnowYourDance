import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { Wand2 } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import { CompositingProvider } from './transform-provider.js';

const PROVIDERS = { compositing: CompositingProvider };

export default function TransformScreen({ config, session, onNext }) {
  const [progress, setProgress] = useState(0);
  const [label, setLabel] = useState('Preparing mask alignment...');
  const [isError, setIsError] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    gsap.fromTo(
      containerRef.current,
      { opacity: 0, y: 18 },
      { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }
    );

    const providerName = config.prompts?.provider || 'compositing';
    const Provider = PROVIDERS[providerName] || CompositingProvider;
    const provider = new Provider();

    const setId = session.character?.promptSet || session.character?.id;
    const promptSet = config.prompts?.sets?.[setId] || config.prompts?.sets?.[config.prompts?.default];

    let pct = 0;
    const timer = setInterval(() => {
      pct = Math.min(pct + 4 + Math.floor(Math.random() * 5), 94);
      setProgress(pct);

      if (pct < 30) {
        setLabel('Identifying face landmarks...');
      } else if (pct < 65) {
        setLabel(`Aligning the ${session.character?.name || 'dance'} mask...`);
      } else if (pct < 95) {
        setLabel('Compositing the museum portrait...');
      } else {
        setLabel('Finalizing keepsake rendering...');
      }
    }, 140);

    (async () => {
      try {
        const outputs = await provider.transform(session.photo, promptSet, (rel) => config.asset(rel));
        session.outputs = outputs;
        setProgress(100);
        setLabel('Transformation complete.');
        clearInterval(timer);
        setTimeout(() => onNext(), 600);
      } catch (err) {
        clearInterval(timer);
        setIsError(true);
        setLabel(`Transformation failed: ${err.message}`);
        console.error(err);
      }
    })();

    return () => clearInterval(timer);
  }, [config, session, onNext]);

  return (
    <section ref={containerRef} className="view-screen active">
      <GlassCard className="glass-card-sm transform-card">
        <div className="card-header">
          <span>Ritual Transformation</span>
          <p>The mask is being aligned to your facial features.</p>
        </div>

        <div className="ritual-spinner" aria-hidden="true">
          <div className="ritual-spinner-ring ritual-spinner-ring-outer" />
          <div className="ritual-spinner-ring ritual-spinner-ring-middle" />
          <div className="ritual-spinner-ring ritual-spinner-ring-inner" />
          <Wand2 size={36} strokeWidth={1.5} />
        </div>

        <p className={`transform-label ${isError ? 'is-error' : ''}`}>{label}</p>

        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>

        <div className="progress-meta">
          <span>Transformation Progress</span>
          <span>{progress}%</span>
        </div>
      </GlassCard>
    </section>
  );
}
