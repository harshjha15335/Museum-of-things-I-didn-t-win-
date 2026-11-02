import { useEffect, useState } from 'react';
import { exhibits } from '../content/exhibits';
import { useMuseum } from '../state/store';
import { SAMSUNG_T } from '../scene/exhibits/Samsung';

const ex = exhibits.find((e) => e.id === 'samsung')!;

/** Samsung dossier card + red NOT SELECTED stamp that lands on the "We didn't." cue. */
export function Dossier() {
  const phase = useMuseum((s) => s.phase.samsung);
  const revealStartedAt = useMuseum((s) => s.revealStartedAt);
  const caption = useMuseum((s) => s.caption);
  const reduced = useMuseum((s) => s.reducedMotion);
  const [, tick] = useState(0);
  const [stamped, setStamped] = useState(phase === 'recovered');

  useEffect(() => {
    if (revealStartedAt === null) return;
    const id = window.setInterval(() => tick((n) => n + 1), 200);
    return () => window.clearInterval(id);
  }, [revealStartedAt]);

  useEffect(() => {
    if (caption?.text === ex.props?.stampCue || phase === 'recovered') setStamped(true);
  }, [caption, phase]);

  const t = revealStartedAt === null ? (phase === 'recovered' ? 99 : -1) : (performance.now() - revealStartedAt) / 1000;
  const visible = reduced ? revealStartedAt !== null || phase === 'recovered' : t >= SAMSUNG_T.dossier;
  if (!visible) return null;
  const rows = (ex.cards ?? []).filter((c) => c.id.startsWith('dossier-'));
  return (
    <section className="dossier">
      <div className="dossier-head">
        <div className="kicker">{ex.props?.dossierTitle}</div>
        {stamped && (
          <div className="stamp" role="img" aria-label={ex.props?.stamp}>
            {ex.props?.stamp}
          </div>
        )}
      </div>
      <dl>
        {rows.map((r) => (
          <div key={r.id} className="dossier-row">
            <dt>{r.label}</dt>
            <dd>{r.body}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
