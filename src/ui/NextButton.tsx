import { useEffect, useState } from 'react';
import { exhibits, site } from '../content/exhibits';
import { useMuseum } from '../state/store';

export function NextButton() {
  const started = useMuseum((s) => s.started);
  const traveling = useMuseum((s) => s.traveling);
  const station = useMuseum((s) => s.station);
  const nextPulse = useMuseum((s) => s.nextPulse);
  const mode = useMuseum((s) => s.mode);
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    if (!nextPulse) return;
    setPulse(true);
    const id = window.setTimeout(() => setPulse(false), 1200);
    return () => window.clearTimeout(id);
  }, [nextPulse]);
  if (!started || traveling || mode === 'quick') return null;
  const last = station === exhibits.length - 1;
  return (
    <nav className="nextnav">
      {station > 0 && (
        <button className="text-btn" onClick={() => useMuseum.getState().goBack()}>
          {site.backLabel.toUpperCase()}
        </button>
      )}
      {!last && (
        <button className={`ui-btn gold next ${pulse ? 'pulse' : ''}`} onClick={() => useMuseum.getState().goNext()}>
          {site.nextLabel.toUpperCase()}
        </button>
      )}
    </nav>
  );
}
