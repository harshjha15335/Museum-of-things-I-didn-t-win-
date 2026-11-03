import { useMemo } from 'react';
import { Scene } from './scene/Scene';
import { Hud } from './ui/Hud';
import { LocationCard } from './ui/LocationCard';
import { ActionBar } from './ui/ActionBar';
import { Captions } from './ui/Captions';
import { Footer } from './ui/Footer';
import { Toast } from './ui/Toast';
import { StartScreen } from './ui/StartScreen';
import { Cutscene } from './ui/Cutscene';
import { SlateReader } from './ui/SlateReader';
import { useControls } from './ui/useControls';
import { Museum2D } from './fallback/Museum2D';
import { useMuseum } from './state/store';

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

export default function App() {
  const webgl = useMemo(hasWebGL, []);
  // Spec F6: under 768px wide, or without WebGL, use the 2D museum.
  const force2d = useMemo(() => new URLSearchParams(location.search).has('2d') || window.innerWidth < 768, []);
  const started = useMuseum((s) => s.started);
  const hover = useMuseum((s) => s.hoverArtifact);
  useControls();

  if (!webgl || force2d) return <Museum2D />;

  return (
    <div className={`app ${started ? 'is-started' : ''} ${hover ? 'is-hover' : ''}`}>
      <div className="canvas-wrap">
        <Scene />
      </div>
      <div className="overlay">
        {started && <Hud />}
        <LocationCard />
        <SlateReader />
        <Captions />
        <ActionBar />
        <Toast />
        <StartScreen />
        <Cutscene />
        <Footer />
      </div>
      <div id="fade-cut" aria-hidden />
      <div className="intro-fade" aria-hidden />
    </div>
  );
}
