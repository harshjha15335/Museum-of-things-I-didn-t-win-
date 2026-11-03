import { countedExhibits, exhibits, site } from '../content/exhibits';
import { useMuseum } from '../state/store';

export function TopBar() {
  const phase = useMuseum((s) => s.phase);
  const muted = useMuseum((s) => s.muted);
  const mode = useMuseum((s) => s.mode);
  const station = useMuseum((s) => s.station);
  const musicOn = useMuseum((s) => s.musicOn);
  const cutsceneOn = useMuseum((s) => s.cutscene);
  if (cutsceneOn) return null;
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
      <nav className="story-path" aria-label={site.pathLabel}>
        {exhibits.map((e, i) => (
          <button
            key={e.id}
            className={`path-stop ${i === station ? 'here' : ''} ${phase[e.id] === 'recovered' ? 'done' : ''}`}
            title={`${e.kicker} · ${e.chapter}`}
            aria-current={i === station ? 'step' : undefined}
            onClick={() => {
              const st = useMuseum.getState();
              if (st.mode === 'quick') st.stopTour();
              st.goTo(i);
            }}
          >
            <span className="path-num">{e.number}</span>
          </button>
        ))}
        <span className="path-chapter">{exhibits[station].chapter}</span>
      </nav>
      <div className="controls">
        <button className="ui-btn" aria-pressed={musicOn} onClick={() => useMuseum.getState().toggleMusic()}>
          {musicOn ? site.musicOff : site.musicOn}
        </button>
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
