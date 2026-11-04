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
import { isTouch } from './scene/quality';

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
  // Phones get the full 3D museum (tuned in scene/quality.ts); the text edition is the no-WebGL fallback or ?2d.
  const force2d = useMemo(() => new URLSearchParams(location.search).has('2d'), []);
  const started = useMuseum((s) => s.started);
  const hover = useMuseum((s) => s.hoverArtifact);
  const reading = useMuseum((s) => s.readerOpen);
  useControls();

  if (!webgl || force2d) return <Museum2D />;

  return (
    <div className={`app ${started ? 'is-started' : ''} ${hover ? 'is-hover' : ''} ${reading ? 'is-reading' : ''} ${isTouch ? 'is-touch' : ''}`}>
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
