import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { exhibits, exitDesk, exitPanel, giftShop, hud, site, type Card } from '../content/exhibits';
import { useMuseum } from '../state/store';

/**
 * Case file (v3, Harsh's request 3 Nov: "fewer headings, make inspecting fun").
 * One title, the line being narrated animates in word by word, and the room's facts are a
 * deck of flip cards dealt onto the desk. Missing facts show as redacted, never invented.
 * The full transcript is one tap away for anyone reading with sound off.
 */
export function SlateReader() {
  const open = useMuseum((s) => s.readerOpen);
  const station = useMuseum((s) => s.station);
  const traveling = useMuseum((s) => s.traveling);
  const cueIndex = useMuseum((s) => s.cueIndex);
  const narrating = useMuseum((s) => s.narrating);
  const phase = useMuseum((s) => s.phase[exhibits[s.station].id]);
  const caption = useMuseum((s) => s.caption);
  const [transcript, setTranscript] = useState(false);
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});
  const [lastLine, setLastLine] = useState(-1);
  const [zoom, setZoom] = useState<number | null>(null);
  const zoomRef = useRef<number | null>(null);
  zoomRef.current = zoom;
  const ex = exhibits[station];

  useEffect(() => {
    setTranscript(false);
    setFlipped({});
    setLastLine(-1);
    setZoom(null);
  }, [station]);

  useEffect(() => {
    if (cueIndex >= 0) setLastLine(cueIndex);
  }, [cueIndex]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (zoomRef.current !== null) setZoom(null); // close the enlarged screenshot first
      else useMuseum.getState().closeReader();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Samsung: the red NOT SELECTED stamp lands on the "We didn't." cue.
  const [verdict, setVerdict] = useState(false);
  useEffect(() => {
    setVerdict(phase === 'recovered' && !!ex.props?.stamp);
  }, [station]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (ex.props?.stampCue && caption?.text === ex.props.stampCue) setVerdict(true);
    if (phase === 'recovered' && ex.props?.stamp) setVerdict(true);
  }, [caption, phase, ex]);

  if (!open || traveling) return null;

  const done = phase === 'recovered' && !narrating;
  const shown = lastLine >= 0 ? lastLine : done ? ex.narration.length - 1 : 0;
  const line = ex.narration[shown]?.text ?? '';
  const cards = ex.cards ?? [];
  // Deal one card per two narrated lines, all of them once the file is secured.
  const dealt = done ? cards.length : Math.min(cards.length, Math.floor((shown + 2) / 2));
  const facts = ex.evidence.filter((e) => !e.todo && !e.img);
  const proofs = ex.evidence.filter((e) => e.img);
  const proofLinks = facts.filter((e) => e.url);

  return (
    <aside className="reader cf" aria-label={`${ex.kicker} case file`}>
      <button className="icon-btn cf-close" aria-label={site.readerClose} title={`${site.readerClose} (Esc)`} onClick={() => useMuseum.getState().closeReader()}>
        ✕
      </button>
      <div className="cf-tag">
        {hud.dossierHeader} {ex.number}
        {done && (
          <span className="cf-stamp secured" role="img" aria-label={hud.dossierStatusDone}>
            {hud.dossierStatusDone}
          </span>
        )}
      </div>
      <h2 className="cf-title">{ex.title}</h2>

      <div className="cf-body">
        {!transcript ? (
          <>
            <p className="cf-line" key={`${station}-${shown}`} aria-live="polite">
              {line.split(' ').map((w, i) => (
                <span key={i} style={{ animationDelay: `${i * 45}ms` }}>
                  {w}{' '}
                </span>
              ))}
            </p>
            <div className="cf-dots" aria-hidden>
              {ex.narration.map((_, i) => (
                <span key={i} className={i < shown || done ? 'on' : i === shown ? 'now' : ''} />
              ))}
            </div>
            {verdict && ex.props?.stamp && (
              <div className="cf-stamp verdict" role="img" aria-label={ex.props.stamp}>
                {ex.props.stamp}
              </div>
            )}
          </>
        ) : (
          <p className="cf-transcript">
            {ex.narration.map((c) => c.text).join(' ')}
            {facts.map((f) => (
              <span key={f.label} className="cf-footnote">
                {f.url ? (
                  <a href={f.url} target="_blank" rel="noreferrer">
                    {f.label}
                  </a>
                ) : (
                  f.label
                )}
              </span>
            ))}
          </p>
        )}
        <button className="cf-toggle" onClick={() => setTranscript((v) => !v)}>
          {transcript ? 'Back to the file' : 'Read it all'}
        </button>

        {cards.length > 0 && (
          <div className="cf-deck">
            {cards.slice(0, dealt).map((c, i) => (
              <FlipCard key={c.id} card={c} i={i} flipped={!!flipped[c.id]} onFlip={() => setFlipped((f) => ({ ...f, [c.id]: !f[c.id] }))} />
            ))}
          </div>
        )}
        {cards.length > dealt && <p className="cf-hint">More evidence lands as the curator talks…</p>}

        {proofs.length > 0 && (
          <section className="cf-proof" aria-label={hud.proofLabel}>
            <div className="cf-proof-head">
              <span className="cf-proof-label">{hud.proofLabel}</span>
              {proofLinks.map((l) => (
                <a key={l.url} className="cf-proof-link" href={l.url} target="_blank" rel="noreferrer">
                  {l.label} ↗
                </a>
              ))}
            </div>
            <div className="cf-proof-strip">
              {proofs.map((p, i) => (
                <button key={p.img} className="cf-proof-shot" aria-label={`${p.label}: enlarge`} onClick={() => setZoom(i)}>
                  <img src={p.img} alt={`${p.label} screenshot`} loading="lazy" />
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
            <p className="cf-proof-hint">{hud.proofHint}</p>
          </section>
        )}

        {ex.id === 'vault' && done && <ExitDesk />}
        {!ex.audio && <p className="voice-note inline">{site.synthVoiceNote}</p>}
      </div>

      {zoom !== null &&
        proofs[zoom] &&
        createPortal(
          <div className="cf-lightbox" role="dialog" aria-label={proofs[zoom].label} onClick={() => setZoom(null)}>
            <img src={proofs[zoom].img} alt={`${proofs[zoom].label} screenshot`} />
            <button className="icon-btn cf-lightbox-close" aria-label={hud.proofClose} onClick={() => setZoom(null)}>
              ✕
            </button>
          </div>,
          document.body,
        )}
    </aside>
  );
}

const GLYPHS = ['◆', '✦', '●', '▲', '■', '✚'];

function FlipCard({ card, i, flipped, onFlip }: { card: Card; i: number; flipped: boolean; onFlip: () => void }) {
  const todo = card.body === 'TODO';
  const wide = card.body.length > 120;
  const tilt = ((i % 3) - 1) * 1.6;
  const ref = useRef<HTMLButtonElement>(null);
  return (
    <button
      ref={ref}
      className={`flip ${flipped ? 'flipped' : ''} ${wide ? 'wide' : ''}`}
      style={{ animationDelay: `${i * 90}ms`, ['--tilt' as string]: `${tilt}deg` }}
      aria-pressed={flipped}
      aria-label={`${card.label}: ${flipped ? (todo ? 'classified' : card.body) : 'tap to flip'}`}
      onClick={onFlip}
    >
      <span className="flip-inner">
        <span className="face front">
          <span className="flip-glyph">{GLYPHS[i % GLYPHS.length]}</span>
          <span className="flip-label">{card.label}</span>
          <span className="flip-cta">Tap to flip</span>
        </span>
        <span className="face back">
          <span className="flip-label small">{card.label}</span>
          {todo ? (
            <span className="redacted">
              <i />
              <i />
              <i className="short" />
              <em>Classified · details coming</em>
            </span>
          ) : (
            <span className="flip-body">{card.body}</span>
          )}
        </span>
      </span>
    </button>
  );
}

const todoText = (v: string) => (v === 'TODO' ? <em className="todo">{site.todoLabel}</em> : v);

/** Gift shop ($3,000 setup) + exit desk (logistics and calls to action), at the end of the vault file. */
function ExitDesk() {
  const url = typeof location !== 'undefined' ? location.href.split('#')[0] : '';
  const mail = `mailto:${exitPanel.email}`;
  // video (once it has a URL), LinkedIn, GitHub: the spec's exit panel buttons (C10)
  const links = exitPanel.links.filter((l) => l.url && !l.todo);
  const share = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
  const shareX = `https://x.com/intent/post?text=${encodeURIComponent(exitDesk.shareText)}&url=${encodeURIComponent(url)}`;
  return (
    <>
      <section className="cf-gift">
        <span className="gift-item">{giftShop.item}</span>
        <span className="gift-price">{giftShop.price}</span>
        <p>{todoText(giftShop.body)}</p>
      </section>
      <section className="cf-desk">
        <dl className="desk-rows">
          {exitDesk.rows.map((r) => (
            <div key={r.k}>
              <dt>{r.k}</dt>
              <dd>{todoText(r.v)}</dd>
            </div>
          ))}
          <div>
            <dt>Email</dt>
            <dd>
              <a className="desk-mail" href={mail}>
                {exitPanel.email}
              </a>
            </dd>
          </div>
        </dl>
        <div className="desk-actions">
          <a className="desk-btn primary" href={mail}>
            {exitDesk.hire}
          </a>
          {links.map((l) => (
            <a key={l.label} className="desk-btn" href={l.url} target="_blank" rel="noreferrer">
              {l.label}
            </a>
          ))}
        </div>
        <p className="desk-share">
          {exitDesk.share}:{' '}
          <a href={share} target="_blank" rel="noreferrer">
            LinkedIn
          </a>{' '}
          ·{' '}
          <a href={shareX} target="_blank" rel="noreferrer">
            X
          </a>
        </p>
        <p className="desk-closing">{exitPanel.closing}</p>
      </section>
    </>
  );
}
