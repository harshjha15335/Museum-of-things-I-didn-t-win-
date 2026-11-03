import { exhibits } from '../content/exhibits';
import { useMuseum } from '../state/store';

/** Game-style area title, bottom-left: where you are, which chapter, and the story link. */
export function LocationCard() {
  const station = useMuseum((s) => s.station);
  const traveling = useMuseum((s) => s.traveling);
  const started = useMuseum((s) => s.started);
  const cutsceneOn = useMuseum((s) => s.cutscene);
  const readerOpen = useMuseum((s) => s.readerOpen);
  const mode = useMuseum((s) => s.mode);
  const phase = useMuseum((s) => s.phase[exhibits[s.station].id]);
  if (!started || traveling || cutsceneOn || readerOpen) return null;
  const ex = exhibits[station];
  return (
    <section className={`location ${readerOpen ? 'compact' : ''}`} key={station} aria-live="polite">
      <div className="location-number">{ex.number === '—' ? '!!' : ex.number}</div>
      <h2 className="location-title">{ex.title}</h2>
      {!readerOpen && mode === 'full' && phase === 'idle' && <p className="location-bridge">{ex.bridge}</p>}
      {!readerOpen && mode === 'quick' && <p className="location-bridge">{ex.quickLine}</p>}
    </section>
  );
}
