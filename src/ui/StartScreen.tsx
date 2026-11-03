import { useEffect, useState } from 'react';
import { site } from '../content/exhibits';
import { useMuseum } from '../state/store';
import { startMusic } from '../audio/music';

/** Lobby start screen (spec C8): title, subtitle, ENTER MUSEUM (gold) and QUICK TOUR (outline). */
export function StartScreen() {
  const started = useMuseum((s) => s.started);
  const [gone, setGone] = useState(false);
  useEffect(() => {
    if (!started) return;
    const id = window.setTimeout(() => setGone(true), 600);
    return () => window.clearTimeout(id);
  }, [started]);
  if (gone) return null;
  const start = (mode: 'full' | 'quick') => {
    startMusic(); // first user gesture unlocks audio
    useMuseum.getState().start(mode);
  };
  return (
    <div className={`start ${started ? 'leaving' : ''}`}>
      <h1 className="start-title">{site.title}</h1>
      <p className="start-sub">{site.subtitle}</p>
      <p className="start-tagline">{site.tagline}</p>
      <div className="start-actions">
        <button className="ui-btn gold big" autoFocus onClick={() => start('full')}>
          {site.enterLabel.toUpperCase()}
        </button>
        <button className="ui-btn big" onClick={() => start('quick')}>
          {site.quickTourLabel.toUpperCase()}
        </button>
      </div>
    </div>
  );
}
