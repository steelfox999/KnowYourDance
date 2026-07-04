import React, { useEffect, useMemo, useRef } from 'react';
import gsap from 'gsap';
import GlassCard from '../components/GlassCard';
import { runReveal } from './selection.js';
import { getDanceProfile } from './dance-profiles.js';

export default function RevealScreen({ config, session, onNext }) {
  const containerRef = useRef(null);
  const { character, revealText, ranked, traitScores } = useMemo(
    () => runReveal(config.characters, session.answers || []),
    [config.characters, session.answers]
  );
  const profile = getDanceProfile(character.id);
  const topTraits = ranked.slice(0, 4);

  session.character = character;
  session.revealText = revealText;
  session.traitRanking = ranked;
  session.traitScores = traitScores;

  useEffect(() => {
    const ctx = gsap.context(() => {
      const timeline = gsap.timeline({ defaults: { ease: 'power3.out' } });
      timeline
        .fromTo('.reveal-header', { opacity: 0, y: -16 }, { opacity: 1, y: 0, duration: 0.7 })
        .fromTo('.reveal-panel-anim', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.1 }, '-=0.3')
        .fromTo('.reveal-action', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.5 }, '-=0.2');
    }, containerRef);

    return () => ctx.revert();
  }, [character.id]);

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
              <img src={profile.maskPath} alt={`${character.name} mask`} className="mask-preview-image" />
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
              <span>Capture portrait</span>
              <span className="arrow">-&gt;</span>
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
