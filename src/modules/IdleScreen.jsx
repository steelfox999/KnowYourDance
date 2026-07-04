import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ArrowRight } from 'lucide-react';

export default function IdleScreen({ config, onNext }) {
  const containerRef = useRef(null);
  const idleCfg = config.theme.idle || {};
  const title = config.experience?.name || idleCfg.title || 'Know Your Dance';

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.idle-anim',
        { opacity: 0, y: 28 },
        { opacity: 1, y: 0, duration: 0.8, ease: 'expo.out', stagger: 0.12 }
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={containerRef} className="view-screen active homepage-screen">
      <div className="mandala-container idle-anim">
        <div className="mandala-glow" />

        <svg className="mandala-outer spin-slower" viewBox="0 0 200 200" fill="none" stroke="currentColor">
          <circle cx="100" cy="100" r="95" strokeWidth="1" strokeDasharray="4 4" />
          <circle cx="100" cy="100" r="85" strokeWidth="0.8" />
          <g strokeWidth="1">
            {Array.from({ length: 12 }, (_, index) => (
              <path
                key={index}
                d="M100 15 C115 40 115 60 100 85 C85 60 85 40 100 15 Z"
                transform={`rotate(${index * 30} 100 100)`}
              />
            ))}
          </g>
        </svg>

        <svg className="mandala-inner spin-reverse-slow" viewBox="0 0 100 100" fill="none" stroke="currentColor">
          <polygon points="50,5 63,35 95,50 63,65 50,95 37,65 5,50 37,35" strokeWidth="1.5" />
          <polygon
            points="50,15 60,40 85,50 60,60 50,85 40,60 15,50 40,40"
            strokeWidth="1"
            transform="rotate(45 50 50)"
            strokeDasharray="2 2"
          />
          <circle cx="50" cy="50" r="16" strokeWidth="1.5" />
        </svg>

        <div className="hero-mask-preview">
          <img src="/assets/masks/somana_kunitha.jpg" alt="Indian sacred dance mask" />
        </div>
      </div>

      <h1 className="hero-title text-gradient-gold font-serif idle-anim">{title}</h1>

      <p className="hero-desc idle-anim">
        {idleCfg.tagline || 'Discover the ancient sacred rhythms of India.'}
      </p>

      <button type="button" onClick={onNext} className="btn-royal idle-anim">
        <span>Start the experience</span>
        <ArrowRight className="arrow" size={18} strokeWidth={1.8} aria-hidden="true" />
      </button>
    </section>
  );
}
