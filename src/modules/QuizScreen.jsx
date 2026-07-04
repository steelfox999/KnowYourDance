import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import GlassCard from '../components/GlassCard';

export default function QuizScreen({ config, session, onNext }) {
  const questions = config.quiz?.questions || [];
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const containerRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.quiz-prompt-anim',
        { opacity: 0, y: -14 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }
      );
      gsap.fromTo(
        '.quiz-option-anim',
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out', stagger: 0.08 }
      );
    }, containerRef);

    return () => ctx.revert();
  }, [currentQuestionIndex]);

  const handleChoose = (optionIndex) => {
    const question = questions[currentQuestionIndex];
    session.answers = session.answers || [];
    session.answers.push({
      questionId: question.id,
      optionIndex,
      traits: question.options[optionIndex].traits || {},
    });

    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex >= questions.length) {
      onNext();
    } else {
      setCurrentQuestionIndex(nextIndex);
    }
  };

  const currentQuestion = questions[currentQuestionIndex] || {};

  return (
    <section ref={containerRef} className="view-screen active">
      <GlassCard className="glass-card-md" showCorners={false}>
        <div className="card-header card-header-split quiz-header">
          <div>
            <span>Begin Trial - Resonance Test</span>
            <p>There are no right or wrong answers. Select what speaks to your spirit.</p>
          </div>
          <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
        </div>

        <h2 id="quizQuestionTitle" className="quiz-prompt-anim text-gradient-gold font-serif">
          {currentQuestion.prompt}
        </h2>

        <div className="quiz-options">
          {(currentQuestion.options || []).map((option, optionIndex) => {
            const primaryTrait = Object.keys(option.traits || {})[0] || 'Spirit';
            return (
              <button
                type="button"
                key={`${currentQuestion.id}-${optionIndex}`}
                onClick={() => handleChoose(optionIndex)}
                className="quiz-opt-card quiz-option-anim"
              >
                <span className="quiz-opt-header">
                  <span className="quiz-opt-tag">{primaryTrait}</span>
                  <span className="quiz-opt-letter">{String.fromCharCode(65 + optionIndex)}</span>
                </span>
                <span className="quiz-opt-text">{option.label}</span>
              </button>
            );
          })}
        </div>
      </GlassCard>
    </section>
  );
}
