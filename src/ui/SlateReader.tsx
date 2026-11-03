import { useEffect, useRef } from 'react';
import { exhibits, site } from '../content/exhibits';
import { useMuseum } from '../state/store';
import { Dossier } from './Dossier';

/**
 * The slate's reading panel: the room's full story as text, with the line being
 * narrated highlighted, followed by its cards and evidence. Narration runs alongside.
 */
export function SlateReader() {
  const open = useMuseum((s) => s.readerOpen);
  const station = useMuseum((s) => s.station);
  const traveling = useMuseum((s) => s.traveling);
  const cueIndex = useMuseum((s) => s.cueIndex);
  const narrating = useMuseum((s) => s.narrating);
  const phase = useMuseum((s) => s.phase[exhibits[s.station].id]);
  const body = useRef<HTMLDivElement>(null);
  const ex = exhibits[station];

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') useMuseum.getState().closeReader();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    const el = body.current?.querySelector(`[data-cue="${cueIndex}"]`) as HTMLElement | null;
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [cueIndex]);

  if (!open || traveling) return null;
  const cards = (ex.cards ?? []).filter((c) => !c.id.startsWith('dossier-'));
  return (
    <aside className="reader" aria-label={`${ex.kicker} slate`}>
      <header className="reader-head">
        <div>
          <div className="kicker">{ex.kicker}</div>
          <div className="reader-chapter">{ex.chapter}</div>
        </div>
        <button className="icon-btn" aria-label={site.readerClose} title={`${site.readerClose} (Esc)`} onClick={() => useMuseum.getState().closeReader()}>
          ✕
        </button>
      </header>
      <div className="reader-body" ref={body}>
        <h2 className="plaque-title">{ex.title}</h2>
        <div className="reader-label">{site.readerNarration}</div>
        <p className="reader-story">
          {ex.narration.map((c, i) => (
            <span key={i} data-cue={i} className={i === cueIndex ? 'now' : i < cueIndex || (!narrating && phase === 'recovered') ? 'read' : ''}>
              {c.text}{' '}
            </span>
          ))}
        </p>
        {ex.id === 'samsung' && <Dossier />}
        {cards.map((c) => (
          <section key={c.id} className="reader-card">
            <div className="reader-label">{c.label}</div>
            <p className={c.body === 'TODO' ? 'todo' : ''}>{c.body === 'TODO' ? site.todoLabel : c.body}</p>
          </section>
        ))}
        {ex.evidence.length > 0 && (
          <section className="reader-card">
            <div className="reader-label">{site.readerEvidence}</div>
            <ul className="reader-evidence">
              {ex.evidence.map((e, i) => (
                <li key={i}>
                  {e.url ? (
                    <a href={e.url} target="_blank" rel="noreferrer">
                      {e.label}
                    </a>
                  ) : (
                    <span>{e.label}</span>
                  )}
                  {e.todo && <em className="todo"> · {site.todoLabel}</em>}
                </li>
              ))}
            </ul>
          </section>
        )}
        {!ex.audio && <p className="voice-note inline">{site.synthVoiceNote}</p>}
      </div>
    </aside>
  );
}
