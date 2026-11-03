import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { exhibits, site } from '../content/exhibits';
import { useMuseum } from '../state/store';
import { useLayout } from '../scene/anchors';
import { BUILT } from '../scene/built';

const COL_W = 340;
const MARGIN = 24;
const TOP_SAFE = 72;
const BOTTOM_SAFE = 150; // caption strip + next button + footer

/**
 * Plaque card (spec C7): right third, vertically centred on the artifact,
 * positioned from the artifact's projected screen rect so it never covers it.
 */
export function Plaque() {
  const station = useMuseum((s) => s.station);
  const traveling = useMuseum((s) => s.traveling);
  const started = useMuseum((s) => s.started);
  const mode = useMuseum((s) => s.mode);
  const phase = useMuseum((s) => s.phase[exhibits[s.station].id]);
  const narrating = useMuseum((s) => s.narrating);
  const cutsceneOn = useMuseum((s) => s.cutscene);
  const readerOpen = useMuseum((s) => s.readerOpen);
  const rect = useLayout((s) => s.rect);
  const col = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: 0, top: 0 });
  const [vw, setVw] = useState({ w: window.innerWidth, h: window.innerHeight });

  useEffect(() => {
    const onR = () => setVw({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onR);
    return () => window.removeEventListener('resize', onR);
  }, []);

  useLayoutEffect(() => {
    const h = col.current?.offsetHeight ?? 200;
    const minLeft = (vw.w * 2) / 3;
    const maxLeft = vw.w - COL_W - MARGIN;
    let left = maxLeft;
    let center = vw.h * 0.45;
    if (rect) {
      left = Math.min(maxLeft, Math.max(minLeft, rect.right + 32));
      center = (rect.top + rect.bottom) / 2;
    }
    const top = Math.max(TOP_SAFE, Math.min(vw.h - BOTTOM_SAFE - h, center - h / 2));
    setPos((p) => (Math.abs(p.left - left) + Math.abs(p.top - top) > 2 ? { left, top } : p));
  });

  if (!started || traveling || cutsceneOn || readerOpen) return null;
  const ex = exhibits[station];
  const playable = ex.id !== 'corridor' || BUILT.has(ex.id);
  const quick = mode === 'quick';
  let hint = playable ? ex.hint : site.pendingExhibitHint;
  if (ex.id === 'lobby' && phase === 'recovered') hint = site.lobbyNextHint;
  if (ex.id !== 'lobby' && phase !== 'idle') hint = '';
  if (quick) hint = '';

  const showInspect = playable && !quick && phase === 'idle' && !!ex.inspectLabel;
  const showReplay = playable && !quick && phase === 'recovered' && !narrating && ex.narration.length > 0;
  const showRead = playable && !quick && phase !== 'idle' && ex.id !== 'lobby';

  return (
    <div className="plaque-col" ref={col} style={{ left: pos.left, top: pos.top, width: COL_W }} key={station}>
      <section className="plaque" aria-live="polite">
        <div className="kicker">{ex.kicker}</div>
        <div className="plaque-chapter">{ex.chapter}</div>
        <h2 className="plaque-title">{ex.title}</h2>
        {!quick && phase === 'idle' && <p className="plaque-bridge">{ex.bridge}</p>}
        {hint && <p className="plaque-hint">{hint}</p>}
        {(showInspect || showReplay || showRead) && (
          <div className="plaque-actions">
            {showInspect && (
              <button className="ui-btn gold" onClick={() => useMuseum.getState().inspect()}>
                {ex.inspectLabel}
              </button>
            )}
            {showRead && (
              <button className="ui-btn gold" onClick={() => useMuseum.getState().openReader()}>
                {site.slateLabel}
              </button>
            )}
            {showReplay && (
              <button className="ui-btn" onClick={() => useMuseum.getState().replay()}>
                {site.replayLabel}
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
