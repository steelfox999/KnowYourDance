import React, { useEffect, useRef, useState } from 'react';
import { listThemes } from './core/platform.js';
import { loadExperience, ConfigError } from './core/configLoader.js';
import { Engine, STEPS } from './core/engine.js';
import { MusicEngine } from './core/music.js';

import MandalaBackground from './components/MandalaBackground';
import IdleScreen from './modules/IdleScreen';
import StoryScreen from './modules/StoryScreen';
import QuizScreen from './modules/QuizScreen';
import RevealScreen from './modules/RevealScreen';
import CameraScreen from './modules/CameraScreen';
import TransformScreen from './modules/TransformScreen';
import ResultsScreen from './modules/ResultsScreen';
import PrintScreen from './modules/PrintScreen';
import QrScreen from './modules/QrScreen';

export default function App() {
  const [engine, setEngine] = useState(null);
  const [currentStep, setCurrentStep] = useState(null);
  const [sessionState, setSessionState] = useState(null);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const appContainerRef = useRef(null);

  const applyThemeTokens = (theme) => {
    const t = theme.tokens || {};
    const root = document.documentElement.style;
    const map = {
      '--color-bg': t.bg,
      '--color-surface': t.surface,
      '--color-text': t.text || t.ink,
      '--color-text-muted': t.textMuted || t.muted,
      '--color-border': t.border,
      '--color-saffron': t.saffron || t.accent,
      '--color-terracotta': t.terracotta || t.accent,
      '--color-gold': t.gold || t.accent2,
      '--color-gold-light': t.goldLight || t.accent2,
      '--color-ink': t.text || t.ink,
      '--color-accent': t.saffron || t.accent,
      '--color-accent-2': t.gold || t.accent2,
      '--color-muted': t.textMuted || t.muted,
      '--font-primary': t.fontBody,
      '--font-serif': t.fontDisplay,
      '--font-body': t.fontBody,
      '--font-display': t.fontDisplay,
    };

    for (const [key, value] of Object.entries(map)) {
      if (value) root.setProperty(key, value);
    }
    if (theme.name) document.title = theme.name;
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      const combo = (event.ctrlKey || event.metaKey)
        && event.shiftKey
        && (event.key === 'A' || event.key === 'a');

      if (combo) {
        window.location.href = `admin/admin.html${window.location.search}`;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    async function boot() {
      try {
        const params = new URLSearchParams(window.location.search);
        const themes = await listThemes();
        const themeId = params.get('theme') || themes[0] || 'know-your-dance';

        const loadedConfig = await loadExperience(themeId);
        applyThemeTokens(loadedConfig.theme);
        setConfig(loadedConfig);

        const newEngine = new Engine({ config: loadedConfig });
        const newMusic = new MusicEngine(loadedConfig);

        newEngine.onStep = (step, currentSession) => {
          setCurrentStep(step);
          setSessionState(currentSession);
          newMusic.onStep(step);
        };

        setEngine(newEngine);
        setSessionState(newEngine.session);
        newEngine.start();
        setLoading(false);
      } catch (err) {
        console.error('Fatal boot error:', err);
        setError(err);
        setLoading(false);
      }
    }

    boot();
  }, []);

  if (loading) {
    return (
      <div className="boot-screen">
        <MandalaBackground />
        <div className="ritual-loader" />
        <span>Initializing Know Your Dance...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="config-error-screen">
        <MandalaBackground />
        <div className="glass-card glass-card-sm">
          <div className="ornament ornament-tl" />
          <div className="ornament ornament-tr" />
          <div className="ornament ornament-bl" />
          <div className="ornament ornament-br" />
          <div className="card-header">
            <span>Configuration Problem</span>
            <p>{error instanceof ConfigError ? 'This theme has an invalid config.' : 'The experience failed to start.'}</p>
          </div>
          <pre className="error-log">{error.message}</pre>
          <p className="error-hint">Press Ctrl+Shift+A to open the config builder.</p>
        </div>
      </div>
    );
  }

  const renderStep = () => {
    switch (currentStep) {
      case STEPS.IDLE:
        return <IdleScreen config={config} onNext={() => engine.next()} />;
      case STEPS.STORY:
        return <StoryScreen config={config} onNext={() => engine.next()} />;
      case STEPS.QUIZ:
        return <QuizScreen config={config} session={sessionState} onNext={() => engine.next()} />;
      case STEPS.REVEAL:
        return (
          <RevealScreen
            config={config}
            session={sessionState}
            onNext={() => engine.next()}
            onInvalidAnswers={() => engine.goTo(STEPS.QUIZ)}
          />
        );
      case STEPS.CAMERA:
        return (
          <CameraScreen
            config={config}
            session={sessionState}
            onNext={() => engine.next()}
            onGoTo={(step) => engine.goTo(step)}
          />
        );
      case STEPS.TRANSFORM:
        return <TransformScreen config={config} session={sessionState} onNext={() => engine.next()} />;
      case STEPS.RESULTS:
        return (
          <ResultsScreen
            config={config}
            session={sessionState}
            onNext={() => engine.next()}
            onReset={() => engine.reset()}
          />
        );
      case STEPS.PRINT:
        return <PrintScreen config={config} session={sessionState} onNext={() => engine.next()} />;
      case STEPS.QR:
        return <QrScreen config={config} session={sessionState} onReset={() => engine.reset()} />;
      default:
        return (
          <section className="view-screen active">
            <div className="glass-card glass-card-sm">
              <p>Step "{currentStep}" is not implemented.</p>
            </div>
          </section>
        );
    }
  };

  return (
    <div ref={appContainerRef} className="kyd-shell" data-step={currentStep}>
      <MandalaBackground />
      <main className="app-main" aria-live="polite">
        {renderStep()}
      </main>
    </div>
  );
}
