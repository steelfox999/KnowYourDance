import React, { useEffect, useMemo, useRef } from 'react';
import gsap from 'gsap';
import confetti from 'canvas-confetti';
import { ArrowRight } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import { hasCompleteQuizAnswers, runReveal } from './selection.js';
import { getDanceProfile } from './dance-profiles.js';

export default function RevealScreen({ config, session, onNext, onInvalidAnswers }) {
  const containerRef = useRef(null);
  const hasCompleteAnswers = hasCompleteQuizAnswers(config.quiz, session.answers || []);
  const { character, revealText, ranked, traitScores } = useMemo(
    () => (hasCompleteAnswers
      ? runReveal(config.characters, session.answers || [])
      : { character: null, revealText: null, ranked: [], traitScores: {} }),
    [config.characters, hasCompleteAnswers, session.answers]
  );
  const profile = getDanceProfile(character?.id);
  const maskPreviewPath = profile.maskAsset ? config.asset(profile.maskAsset) : null;
  const topTraits = ranked.slice(0, 4);

  if (hasCompleteAnswers && character) {
    session.character = character;
    session.revealText = revealText;
    session.traitRanking = ranked;
    session.traitScores = traitScores;
  }

  useEffect(() => {
    if (hasCompleteAnswers && character) return undefined;
    console.warn('Reveal reached without a complete quiz. Returning to questions.');
    session.answers = [];
    session.character = null;
    session.revealText = null;
    session.traitRanking = [];
    session.traitScores = {};
    const timer = window.setTimeout(() => onInvalidAnswers?.(), 700);
    return () => window.clearTimeout(timer);
  }, [character, hasCompleteAnswers, onInvalidAnswers, session]);

  useEffect(() => {
    if (!character) return undefined;

    confetti({
      particleCount: 120,
      spread: 90,
      origin: { y: 0.6 },
      colors: ['#D35400', '#C09A3F', '#DFBA6B', '#8E341B', '#F8F5F0'],
    });

    const ctx = gsap.context(() => {
      const timeline = gsap.timeline({ defaults: { ease: 'expo.out' } });
      timeline
        .fromTo('.reveal-header', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.8, clearProps: 'all' })
        .fromTo('.reveal-panel-anim', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, clearProps: 'all' }, '-=0.35')
        .fromTo('.reveal-action', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, clearProps: 'all' }, '-=0.25');
    }, containerRef);

    return () => ctx.revert();
  }, [character]);

  if (!hasCompleteAnswers || !character) {
    return (
      <section ref={containerRef} className="view-screen active">
        <GlassCard className="glass-card-sm">
          <div className="card-header">
            <span>Questions Needed</span>
            <p>Returning to the quiz so your mask is chosen from your answers.</p>
          </div>
        </GlassCard>
      </section>
    );
  }

  return (
    <section ref={containerRef} className="view-screen active">
      <GlassCard className="glass-card-lg" showCorners={false}>
        <div className="reveal-header">
          <div className="tag-pill">Sacred Spirit Match</div>
          <h2 className="font-serif">Your Spirit Resonates With</h2>
          <h3 id="revealArtformTitle" className="text-gradient-gold">{character.name}</h3>
          <p id="revealArtformSubtitle">{profile.subtitle || character.title}</p>
        </div>

        <div className="reveal-grid">
          <div className="souvenir-wrapper reveal-panel-anim">
            <div className="souvenir-canvas-container mask-preview-container">
              {maskPreviewPath && (
                <img src={maskPreviewPath} alt={`${character.name} mask`} className="mask-preview-image" />
              )}
              <div className="souvenir-label">Museum Mask Preview</div>
            </div>

            <div className="mask-controls">
              <div className="mask-controls-header">
                <span>Your strongest alignments</span>
              </div>
              <div className="trait-chip-grid">
                {topTraits.map((trait) => (
                  <span key={trait.trait} className="trait-chip">
                    {trait.trait}
                  </span>
                ))}
              </div>
            </div>

            <button type="button" onClick={onNext} className="btn-royal reveal-action">
              <span>Create keepsake</span>
              <ArrowRight className="arrow" size={18} strokeWidth={1.8} aria-hidden="true" />
            </button>
          </div>

          <div className="reveal-panel-anim">
            <div className="info-card">
              <h4>Essence & Ritual Significance</h4>
              <p>{profile.description}</p>
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

            <div className="info-card lore-card">
              <h4>The Mask Symbolism</h4>
              <p>{profile.maskLore}</p>
            </div>

            <div className="info-card reveal-reason-card">
              <h4>Why This Mask Chose You</h4>
              <p>{revealText}</p>
            </div>
          </div>
        </div>
      </GlassCard>
    </section>
  );
}
