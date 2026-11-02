import { exhibits, type ExhibitId } from '../content/exhibits';
import { useMuseum } from '../state/store';

/** Derived exhibit status for a 3D room component. */
export function useExhibit(id: ExhibitId) {
  const index = exhibits.findIndex((e) => e.id === id);
  const here = useMuseum((s) => s.station === index);
  const traveling = useMuseum((s) => s.traveling);
  const started = useMuseum((s) => s.started);
  const phase = useMuseum((s) => s.phase[id]);
  const revealStartedAt = useMuseum((s) => (s.station === index ? s.revealStartedAt : null));
  const mode = useMuseum((s) => s.mode);
  const arrived = here && !traveling && started;
  return { index, here, arrived, phase, revealStartedAt, mode };
}
