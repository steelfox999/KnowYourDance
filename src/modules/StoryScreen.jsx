import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ArrowRight } from 'lucide-react';
import GlassCard from '../components/GlassCard';

export default function StoryScreen({ config, onNext }) {
  const beats = config.story?.beats || [];
  const [currentBeatIndex, setCurrentBeatIndex] = useState(0);
  const textRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    gsap.fromTo(
      containerRef.current,
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.8, ease: 'expo.out' }
    );
  }, []);

  const handleNext = () => {
    gsap.to(textRef.current, {
      opacity: 0,
      y: -10,
      duration: 0.3,
      ease: 'expo.inOut',
      onComplete: () => {
        const nextIndex = currentBeatIndex + 1;
        if (nextIndex >= beats.length) {
          onNext();
          return;
        }

        setCurrentBeatIndex(nextIndex);
        gsap.fromTo(
          textRef.current,
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.6, ease: 'expo.out', clearProps: 'all' }
        );
      },
    });
  };

  const currentBeat = beats[currentBeatIndex] || {};

  return (
    <section ref={containerRef} className="view-screen active">
      <GlassCard className="glass-card-sm">
        <div className="card-header card-header-split">
          <span>Sacred Echoes - Prologue</span>
          <span>Verse {currentBeatIndex + 1} of {beats.length}</span>
        </div>

        <div className="story-content">
          <p ref={textRef} id="storyLineText" className="font-serif">
            {currentBeat.text}
          </p>
        </div>

        <div className="story-dots" aria-hidden="true">
          {beats.map((_, index) => (
            <div
              key={index}
              className={`story-dot ${index === currentBeatIndex ? 'active' : ''}`}
            />
          ))}
        </div>

        <button type="button" onClick={handleNext} className="btn-secondary">
          <span>{currentBeatIndex === beats.length - 1 ? 'Begin trial' : 'Continue'}</span>
          <ArrowRight className="arrow" size={18} strokeWidth={1.8} aria-hidden="true" />
        </button>
      </GlassCard>
    </section>
  );
}
