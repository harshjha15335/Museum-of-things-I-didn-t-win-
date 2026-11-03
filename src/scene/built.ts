import type { ExhibitId } from '../content/exhibits';

/** Rooms whose 3D set + reveal exist so far (Phase 1). Others show a "being installed" plinth. */
export const BUILT = new Set<ExhibitId>(['lobby', 'samsung', 'vault']);
