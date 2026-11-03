import { exhibits, hud } from '../content/exhibits';
import { useMuseum } from '../state/store';
import { BUILT } from '../scene/built';
import { Key } from './Hud';

/** Bottom-right key prompts: the only buttons the visitor needs. All clickable too. */
export function ActionBar() {
  const started = useMuseum((s) => s.started);
  const traveling = useMuseum((s) => s.traveling);
  const station = useMuseum((s) => s.station);
  const mode = useMuseum((s) => s.mode);
  const cutsceneOn = useMuseum((s) => s.cutscene);
  const readerOpen = useMuseum((s) => s.readerOpen);
  const narrating = useMuseum((s) => s.narrating);
  const nextPulse = useMuseum((s) => s.nextPulse);
  const phase = useMuseum((s) => s.phase[exhibits[s.station].id]);
  if (!started || traveling || cutsceneOn || mode === 'quick') return null;
  const ex = exhibits[station];
  const last = station === exhibits.length - 1;
  const readable = ex.id !== 'lobby' && (ex.id !== 'corridor' || BUILT.has(ex.id));
  const S = () => useMuseum.getState();
  return (
    <nav className="actions" aria-label="Actions">
      {readable && !readerOpen && (
        <button className={`act primary ${phase === 'idle' ? 'pulse' : ''}`} onClick={() => S().openReader()}>
          <Key k="E" /> {ex.id === 'samsung' && phase === 'idle' ? hud.promptInspect : hud.promptRead}
        </button>
      )}
      {readerOpen && (
        <button className="act" onClick={() => S().closeReader()}>
          <Key k="E" /> {hud.promptClose}
        </button>
      )}
      {phase === 'recovered' && !narrating && ex.narration.length > 0 && (
        <button className="act" onClick={() => S().replay()}>
          <Key k="R" /> {hud.promptReplay}
        </button>
      )}
      {station > 0 && (
        <button className="act" onClick={() => S().goBack()}>
          <Key k="←" /> {hud.promptBack}
        </button>
      )}
      {!last && (
        <button className={`act next ${nextPulse ? 'flash' : ''}`} key={nextPulse} onClick={() => S().goNext()}>
          <Key k="→" /> {hud.promptNext}
        </button>
      )}
    </nav>
  );
}
