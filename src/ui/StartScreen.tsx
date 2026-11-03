import { useEffect, useState } from 'react';
import { hud } from '../content/exhibits';
import { useMuseum } from '../state/store';
import { startMusic } from '../audio/music';

/** Home screen: one big title, one line, two buttons (Harsh, 3 Nov: "big and clear, not a lot of text"). */
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
      if (['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        setSel((v) => (v === 0 ? 1 : 0));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [started]);
  if (gone) return null;
  const items = [
    { label: hud.homeEnter, mode: 'full' as const },
    { label: hud.homeQuick, mode: 'quick' as const },
  ];
  const rows = hud.homeTitle;
  return (
    <div className={`briefing home ${started ? 'leaving' : ''}`}>
      <div className="home-scrim" />
      <div className="home-inner">
        <h1 className="home-title" aria-label={rows.join(' ')}>
          {rows.map((r, i) => (
            <span key={r} className={i === rows.length - 1 ? 'accent' : ''} style={{ animationDelay: `${150 + i * 160}ms` }}>
              {r}
            </span>
          ))}
        </h1>
        <p className="home-hook">{hud.briefingHook}</p>
        <div className="home-actions" role="menu">
          {items.map((it, i) => (
            <button
              key={it.mode}
              role="menuitem"
              className={`home-btn ${i === 0 ? 'primary' : ''} ${sel === i ? 'sel' : ''}`}
              autoFocus={i === 0}
              onMouseEnter={() => setSel(i)}
              onFocus={() => setSel(i)}
              onClick={() => start(it.mode)}
            >
              {it.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
