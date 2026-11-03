import { useEffect, useState } from 'react';
import { countedExhibits, hud } from '../content/exhibits';
import { useMuseum } from '../state/store';

/** "Objective updated" banner when an artifact is recovered. */
export function Toast() {
  const toast = useMuseum((s) => s.toast);
  const phase = useMuseum((s) => s.phase);
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!toast) return;
    setShow(true);
    const id = window.setTimeout(() => setShow(false), 2600);
    return () => window.clearTimeout(id);
  }, [toast]);
  const n = countedExhibits.filter((e) => phase[e.id] === 'recovered').length;
  return (
    <div className={`objective-toast ${show ? 'on' : ''}`} role="status">
      <span className="hud-label">{hud.toastObjective}</span>
      <span className="objective-toast-main">
        {hud.toastRecovered} · {n}/{countedExhibits.length}
      </span>
    </div>
  );
}
