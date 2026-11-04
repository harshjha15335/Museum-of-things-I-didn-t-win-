import { useEffect, useState } from 'react';
import { hud } from '../content/exhibits';
import { useMuseum } from '../state/store';

/** Game-style subtitles: speaker tag + line, no box. Fade out when narration ends. */
export function Captions() {
  const caption = useMuseum((s) => s.caption);
  const narrating = useMuseum((s) => s.narrating);
  const hidden = useMuseum((s) => s.cutscene || s.readerOpen);
  const [last, setLast] = useState(caption);
  useEffect(() => {
    if (caption) setLast(caption);
  }, [caption]);
  const shown = caption ?? (narrating ? last : null);
  const visible = !!shown && !hidden;
  return (
    <div className={`subs ${visible ? 'on' : ''}`} aria-hidden={!visible}>
      <p className="subs-line" key={(shown ?? last)?.key} aria-live="polite">
        <span className="subs-speaker">{hud.speaker}:</span> {(shown ?? last)?.text}
      </p>
    </div>
  );
}
