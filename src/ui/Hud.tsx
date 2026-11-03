import { countedExhibits, exhibits, hud, site } from '../content/exhibits';
import { useMuseum } from '../state/store';

/** Key-cap chip used across the HUD. */
export function Key({ k }: { k: string }) {
  return <kbd className="key">{k}</kbd>;
}

/** Top-left objective tracker (replaces diamonds + path strip) and top-right audio status. */
export function Hud() {
  const phase = useMuseum((s) => s.phase);
  const station = useMuseum((s) => s.station);
  const muted = useMuseum((s) => s.muted);
  const musicOn = useMuseum((s) => s.musicOn);
  const mode = useMuseum((s) => s.mode);
  const cutsceneOn = useMuseum((s) => s.cutscene);
  if (cutsceneOn) return null;
  const recovered = countedExhibits.filter((e) => phase[e.id] === 'recovered').length;
  const all = recovered === countedExhibits.length;
  const go = (id: string) => {
    const st = useMuseum.getState();
    if (st.mode === 'quick') st.stopTour();
    st.goTo(exhibits.findIndex((e) => e.id === id));
  };
  return (
    <>
      <section className="hud-objective" aria-label={hud.objectiveLabel}>
        <div className="hud-label">
          <span className="hud-blip" /> {hud.objectiveLabel}
          <span className="hud-count">
            {recovered}/{countedExhibits.length}
          </span>
        </div>
        <div className="hud-objective-line">{all ? hud.objectiveDone : hud.objectiveLine}</div>
        <ol className="hud-list">
          {countedExhibits.map((e) => {
            const done = phase[e.id] === 'recovered';
            const here = exhibits[station].id === e.id;
            return (
              <li key={e.id}>
                <button className={`hud-item ${done ? 'done' : ''} ${here ? 'here' : ''}`} onClick={() => go(e.id)}>
                  <span className="hud-check" aria-hidden>
                    {done ? '■' : here ? '▸' : '□'}
                  </span>
                  {hud.artifacts[e.id]}
                </button>
              </li>
            );
          })}
        </ol>
      </section>
      <div className="hud-status">
        {mode === 'quick' && (
          <button className="hud-chip" onClick={() => useMuseum.getState().stopTour()}>
            <Key k="Esc" /> {hud.stopRecon}
          </button>
        )}
        <button className="hud-chip" aria-pressed={musicOn} onClick={() => useMuseum.getState().toggleMusic()}>
          <Key k="B" /> {hud.musicLabel} <b className={musicOn ? 'on' : 'off'}>{musicOn ? 'ON' : 'OFF'}</b>
        </button>
        <button className="hud-chip" aria-pressed={!muted} aria-label={muted ? site.unmuteLabel : site.muteLabel} onClick={() => useMuseum.getState().toggleMute()}>
          <Key k="⇧M" /> {hud.audioOn} <b className={muted ? 'off' : 'on'}>{muted ? 'OFF' : 'ON'}</b>
        </button>
      </div>
    </>
  );
}
