import { useEffect, useState } from 'react';
import { hud } from '../content/exhibits';
import { useMuseum } from '../state/store';
import { startMusic } from '../audio/music';

/** Job-briefing title screen with a vertical game menu. */
export function StartScreen() {
  const started = useMuseum((s) => s.started);
  const [gone, setGone] = useState(false);
  const [sel, setSel] = useState(0);
  useEffect(() => {
    if (!started) return;
    const id = window.setTimeout(() => setGone(true), 600);
    return () => window.clearTimeout(id);
  }, [started]);
  const start = (mode: 'full' | 'quick') => {
    startMusic(); // first user gesture unlocks audio
    useMuseum.getState().start(mode);
  };
  useEffect(() => {
    if (started) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setSel((v) => (v === 0 ? 1 : 0));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [started]);
  if (gone) return null;
  const items = [
    { label: hud.startJob, sub: hud.startJobSub, mode: 'full' as const },
    { label: hud.quickRecon, sub: hud.quickReconSub, mode: 'quick' as const },
  ];
  return (
    <div className={`briefing ${started ? 'leaving' : ''}`}>
      <div className="briefing-scrim" />
      <div className="briefing-inner">
        <div className="hud-label">
          <span className="hud-blip" /> {hud.briefingKicker}
        </div>
        <h1 className="briefing-title">
          <span>{hud.briefingTitleTop}</span>
          <span className="accent">{hud.briefingTitleBottom}</span>
        </h1>
        <p className="briefing-hook">{hud.briefingHook}</p>
        <p className="briefing-line">{hud.briefingLine}</p>
        <ul className="menu" role="menu">
          {items.map((it, i) => (
            <li key={it.mode}>
              <button
                role="menuitem"
                className={`menu-item ${sel === i ? 'sel' : ''}`}
                autoFocus={i === 0}
                onMouseEnter={() => setSel(i)}
                onFocus={() => setSel(i)}
                onClick={() => start(it.mode)}
              >
                <span className="menu-caret">{sel === i ? '▸' : ''}</span>
                <span className="menu-label">{it.label}</span>
                <span className="menu-sub">{it.sub}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="briefing-meta">
          {hud.briefingMeta.map((m) => (
            <span key={m}>{m}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
