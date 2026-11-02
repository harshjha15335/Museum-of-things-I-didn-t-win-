import { countedExhibits, site } from '../content/exhibits';
import { useMuseum } from '../state/store';

export function TopBar() {
  const phase = useMuseum((s) => s.phase);
  const muted = useMuseum((s) => s.muted);
  const mode = useMuseum((s) => s.mode);
  const recovered = countedExhibits.filter((e) => phase[e.id] === 'recovered').length;
  return (
    <header className="topbar">
      <div className="progress" aria-label={`${site.progressLabel} ${recovered} of ${countedExhibits.length}`}>
        <span className="progress-label">
          {site.progressLabel.toUpperCase()} {recovered}/{countedExhibits.length}
        </span>
        <span className="diamonds" aria-hidden>
          {countedExhibits.map((e) => (
            <span key={e.id} className={`diamond ${phase[e.id] === 'recovered' ? 'filled' : ''}`} title={e.kicker} />
          ))}
        </span>
      </div>
      <div className="controls">
        {mode === 'quick' && (
          <button className="ui-btn" onClick={() => useMuseum.getState().stopTour()}>
            {site.stopTourLabel}
          </button>
        )}
        <button className="ui-btn" aria-pressed={muted} onClick={() => useMuseum.getState().toggleMute()}>
          {muted ? site.unmuteLabel : site.muteLabel}
        </button>
      </div>
    </header>
  );
}
