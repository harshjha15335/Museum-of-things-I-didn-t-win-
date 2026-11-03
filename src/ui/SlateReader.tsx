import { useEffect, useRef } from 'react';
import { exhibits, exitDesk, exitPanel, giftShop, hud, site } from '../content/exhibits';
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
          <div className="hud-label">
            <span className="hud-blip" /> {hud.dossierHeader} {ex.number} // {ex.kicker.split('·')[1]?.trim()}
          </div>
          <div className="reader-chapter">{ex.chapter}</div>
        </div>
        <span className={`reader-status ${phase === 'recovered' ? 'done' : ''}`}>
          {phase === 'recovered' ? hud.dossierStatusDone : hud.dossierStatusOpen}
        </span>
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
        {ex.id === 'vault' && <ExitDesk />}
        {!ex.audio && <p className="voice-note inline">{site.synthVoiceNote}</p>}
      </div>
    </aside>
  );
}

const todo = (v: string) => (v === 'TODO' ? <em className="todo">{site.todoLabel}</em> : v);

/** Gift shop ($3,000 setup) + exit desk (logistics and calls to action), at the end of the vault file. */
function ExitDesk() {
  const url = typeof location !== 'undefined' ? location.href.split('#')[0] : '';
  const linkedin = exitPanel.links.find((l) => l.label === 'LinkedIn')?.url;
  const share = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
  const shareX = `https://x.com/intent/post?text=${encodeURIComponent(exitDesk.shareText)}&url=${encodeURIComponent(url)}`;
  return (
    <>
      <section className="reader-card gift">
        <div className="reader-label">{giftShop.label}</div>
        <div className="gift-row">
          <span className="gift-item">{giftShop.item}</span>
          <span className="gift-price">{giftShop.price}</span>
        </div>
        <p>{todo(giftShop.body)}</p>
      </section>
      <section className="reader-card desk">
        <div className="reader-label">{exitDesk.label}</div>
        <dl className="desk-rows">
          {exitDesk.rows.map((r) => (
            <div key={r.k}>
              <dt>{r.k}</dt>
              <dd>{todo(r.v)}</dd>
            </div>
          ))}
        </dl>
        <div className="desk-actions">
          {linkedin && (
            <a className="desk-btn primary" href={linkedin} target="_blank" rel="noreferrer">
              {exitDesk.hire}
            </a>
          )}
          <a className="desk-btn" href={share} target="_blank" rel="noreferrer">
            {exitDesk.share} · LinkedIn
          </a>
          <a className="desk-btn" href={shareX} target="_blank" rel="noreferrer">
            X
          </a>
        </div>
        <p className="desk-closing">{exitPanel.closing}</p>
      </section>
    </>
  );
}
