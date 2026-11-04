import { useState } from 'react';
import { countedExhibits, exhibits, hud, site } from '../content/exhibits';
import { useMuseum } from '../state/store';

/** Key-cap chip used across the HUD. Hidden on touch screens, except the arrows, which become plain icons. */
export function Key({ k }: { k: string }) {
  return (
    <kbd className="key" data-k={k}>
      {k}
    </kbd>
  );
}

const NoteIcon = () => (
  <svg className="chip-icon" viewBox="0 0 24 24" aria-hidden>
    <path d="M9 18.5a2.5 2.5 0 1 1-2-2.45V5l11-2v12.5a2.5 2.5 0 1 1-2-2.45V7.1L9 8.4z" fill="currentColor" />
  </svg>
);
const SpeakerIcon = ({ on }: { on: boolean }) => (
  <svg className="chip-icon" viewBox="0 0 24 24" aria-hidden>
    <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
    {on ? (
      <path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    ) : (
      <path d="M16.5 9.5l5 5m0-5l-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    )}
  </svg>
);

/** Top-left objective tracker (replaces diamonds + path strip) and top-right audio status. */
export function Hud() {
  const phase = useMuseum((s) => s.phase);
  const station = useMuseum((s) => s.station);
  const muted = useMuseum((s) => s.muted);
  const musicOn = useMuseum((s) => s.musicOn);
  const mode = useMuseum((s) => s.mode);
  const cutsceneOn = useMuseum((s) => s.cutscene);
  // Phones: the list folds away behind the objective line (tap to open), so it doesn't cover the room.
  const [listOpen, setListOpen] = useState(false);
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
      <section className={`hud-objective ${listOpen ? 'open' : ''}`} aria-label={hud.objectiveLabel}>
        <button className="hud-fold" aria-expanded={listOpen} onClick={() => setListOpen((v) => !v)}>
          <span className="hud-label">
            <span className="hud-blip" /> {hud.objectiveLabel}
            <span className="hud-count">
              {recovered}/{countedExhibits.length}
            </span>
            <span className="hud-caret" aria-hidden>
              ▾
            </span>
          </span>
          <span className="hud-objective-line">{all ? hud.objectiveDone : hud.objectiveLine}</span>
        </button>
        <ol className="hud-list">
          {countedExhibits.map((e) => {
            const done = phase[e.id] === 'recovered';
            const here = exhibits[station].id === e.id;
            return (
              <li key={e.id}>
                <button
                  className={`hud-item ${done ? 'done' : ''} ${here ? 'here' : ''}`}
                  onClick={() => {
                    setListOpen(false);
                    go(e.id);
                  }}
                >
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
        <button className={`hud-chip ${musicOn ? '' : 'is-off'}`} aria-pressed={musicOn} aria-label={hud.musicLabel} onClick={() => useMuseum.getState().toggleMusic()}>
          <Key k="B" />
          <NoteIcon />
          <span className="chip-text">
            {hud.musicLabel} <b className={musicOn ? 'on' : 'off'}>{musicOn ? 'ON' : 'OFF'}</b>
          </span>
        </button>
        <button className={`hud-chip ${muted ? 'is-off' : ''}`} aria-pressed={!muted} aria-label={muted ? site.unmuteLabel : site.muteLabel} onClick={() => useMuseum.getState().toggleMute()}>
          <Key k="⇧M" />
          <SpeakerIcon on={!muted} />
          <span className="chip-text">
            {hud.audioOn} <b className={muted ? 'off' : 'on'}>{muted ? 'OFF' : 'ON'}</b>
          </span>
        </button>
      </div>
    </>
  );
}
