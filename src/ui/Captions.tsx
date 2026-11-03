import { useEffect, useState } from 'react';
import { site } from '../content/exhibits';
import { useMuseum } from '../state/store';
import { narrator } from '../audio/narration';

/** Bottom caption strip (spec C6/C7). Fades out when narration ends; never says "end of narration". */
export function Captions() {
  const caption = useMuseum((s) => s.caption);
  const narrating = useMuseum((s) => s.narrating);
  const mode = useMuseum((s) => s.mode);
  const hidden = useMuseum((s) => s.readerOpen || s.cutscene);
  const [last, setLast] = useState(caption);
  useEffect(() => {
    if (caption) setLast(caption);
  }, [caption]);
  const shown = caption ?? (narrating ? last : null);
  const visible = !!shown && !hidden;
  return (
    <div className={`captions ${visible ? 'on' : ''}`} aria-hidden={!visible}>
      <span className="caption-label">{site.captionLabel.toUpperCase()}</span>
      <p className="caption-text" key={(shown ?? last)?.key} aria-live="polite">
        {(shown ?? last)?.text}
      </p>
      {mode === 'full' && (
        <span className="caption-ctrls">
          <button className="icon-btn" title={`${site.replayLabel} (R)`} aria-label={site.replayLabel} tabIndex={visible ? 0 : -1} onClick={() => useMuseum.getState().replay()}>
            ↺
          </button>
          <button className="icon-btn" title={`${site.skipLabel} (S)`} aria-label={site.skipLabel} tabIndex={visible ? 0 : -1} onClick={() => narrator.skip()}>
            ⏭
          </button>
        </span>
      )}
    </div>
  );
}
