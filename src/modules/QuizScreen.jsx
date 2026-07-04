import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import GlassCard from '../components/GlassCard';

export default function QuizScreen({ config, session, onNext }) {
  const questions = config.quiz?.questions || [];
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isChoosing, setIsChoosing] = useState(false);
  const containerRef = useRef(null);
  const questionTitleRef = useRef(null);
  const optionsContainerRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.quiz-prompt-anim',
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.8, ease: 'expo.out', clearProps: 'all' }
      );
      gsap.fromTo(
        '.quiz-option-anim',
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.8, ease: 'expo.out', stagger: 0.1, clearProps: 'all' }
      );
    }, containerRef);

    return () => ctx.revert();
  }, [currentQuestionIndex]);

  const handleChoose = (optionIndex) => {
    if (isChoosing) return;
    setIsChoosing(true);

    const question = questions[currentQuestionIndex];
    session.answers = session.answers || [];
    session.answers.push({
      questionId: question.id,
      optionIndex,
      traits: question.options[optionIndex].traits || {},
    });

    const nextIndex = currentQuestionIndex + 1;
    gsap.to([questionTitleRef.current, optionsContainerRef.current], {
      opacity: 0,
      y: -10,
      duration: 0.3,
      ease: 'expo.inOut',
      onComplete: () => {
        gsap.set(optionsContainerRef.current, { opacity: 1, y: 0 });
        if (nextIndex >= questions.length) {
          onNext();
          return;
        }
        setCurrentQuestionIndex(nextIndex);
        setIsChoosing(false);
      },
    });
  };

  const currentQuestion = questions[currentQuestionIndex] || {};

  return (
    <section ref={containerRef} className="view-screen active">
      <GlassCard className="glass-card-md" showCorners={false}>
        <div className="quiz-count">
          <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
        </div>

        <h2 ref={questionTitleRef} id="quizQuestionTitle" className="quiz-prompt-anim text-gradient-gold font-serif">
          {currentQuestion.prompt}
        </h2>

        <div ref={optionsContainerRef} className="quiz-options">
          {(currentQuestion.options || []).map((option, optionIndex) => {
            return (
              <button
                type="button"
                key={`${currentQuestion.id}-${optionIndex}`}
                onClick={() => handleChoose(optionIndex)}
                disabled={isChoosing}
                className="quiz-opt-card quiz-option-anim"
              >
                <span className="quiz-opt-header">
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
