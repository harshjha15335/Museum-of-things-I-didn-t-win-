import { useEffect, useState } from 'react';
import { cutscene, site } from '../content/exhibits';
import { useMuseum } from '../state/store';
import { say, hush } from '../audio/voice';

/**
 * Opening cutscene: letterboxed title cards over a camera fly-through of the hall
 * (camera moves live in CameraRig). Narrated by the placeholder voice unless muted.
 */
export function Cutscene() {
  const active = useMuseum((s) => s.cutscene);
  const muted = useMuseum((s) => s.muted);
  const [shot, setShot] = useState(0);

  useEffect(() => {
    if (!active) return;
    setShot(0);
    let i = 0;
    let timer: number;
    const s = useMuseum.getState();
    s.setNarrating(true);
    const next = () => {
      if (i >= cutscene.length) {
        useMuseum.getState().endCutscene();
        return;
      }
      setShot(i);
      if (!useMuseum.getState().muted) void say(cutscene[i].line);
      timer = window.setTimeout(() => {
        i++;
        next();
      }, cutscene[i].duration * 1000);
    };
    next();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') useMuseum.getState().endCutscene();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', onKey);
      hush();
      useMuseum.getState().setNarrating(false);
    };
  }, [active]);

  useEffect(() => {
    if (muted) hush();
  }, [muted]);

  if (!active) return null;
  const s = cutscene[shot];
  return (
    <div className="cutscene" role="dialog" aria-label="Intro">
      <div className="letterbox top" />
      <div className="letterbox bottom" />
      <div className="cut-card" key={shot}>
        {s.kicker && <div className="kicker">{s.kicker}</div>}
        <p className="cut-line">{s.line}</p>
      </div>
      <div className="cut-progress" aria-hidden>
        {cutscene.map((_, i) => (
          <span key={i} className={i <= shot ? 'on' : ''} />
        ))}
      </div>
      <button className="ui-btn cut-skip" onClick={() => useMuseum.getState().endCutscene()}>
        {site.skipIntro.toUpperCase()}
      </button>
      <span className="voice-note">{site.synthVoiceNote}</span>
    </div>
  );
}
