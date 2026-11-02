import { create } from 'zustand';
import { exhibits, site, type ExhibitId } from '../content/exhibits';

/**
 * Exhibit state machine (spec C5).
 *  idle      — not visited / walked past without inspecting
 *  reveal    — inspected; reveal animation + narration running
 *  recovered — narration ended or skipped (counted rooms fill their diamond)
 * "arrived" is derived: station === index && !traveling.
 */
export type ExhibitPhase = 'idle' | 'reveal' | 'recovered';
export type Mode = 'full' | 'quick';
export type Pending = 'next' | 'back' | number | null;

export type Caption = { text: string; key: string } | null;

type State = {
  started: boolean;
  mode: Mode;
  station: number;
  traveling: boolean;
  pending: Pending;
  pushedIn: boolean;
  phase: Record<ExhibitId, ExhibitPhase>;
  /** Seconds elapsed in the current exhibit's reveal (drives room animations). */
  revealStartedAt: number | null;
  muted: boolean;
  caption: Caption;
  /** True while the narration clock for the current station is running. */
  narrating: boolean;
  toast: { text: string; key: number } | null;
  nextPulse: number;
  reducedMotion: boolean;
  lowPower: boolean;
  hoverArtifact: boolean;

  start: (mode: Mode) => void;
  stopTour: () => void;
  goTo: (index: number) => void;
  goNext: () => void;
  goBack: () => void;
  arrive: () => void;
  inspect: () => void;
  setRecovered: (id: ExhibitId) => void;
  replay: () => void;
  setCaption: (c: Caption) => void;
  setNarrating: (v: boolean) => void;
  showToast: (text: string) => void;
  toggleMute: () => void;
  setLowPower: (v: boolean) => void;
  setHoverArtifact: (v: boolean) => void;
};

const initialPhase = Object.fromEntries(exhibits.map((e) => [e.id, 'idle'])) as Record<ExhibitId, ExhibitPhase>;

const readHashStation = () => {
  const m = typeof location !== 'undefined' ? location.hash.match(/station=(\w+)/) : null;
  if (!m) return 0;
  const i = exhibits.findIndex((e) => e.id === m[1]);
  return i >= 0 ? i : 0;
};

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export const useMuseum = create<State>((set, get) => ({
  started: false,
  mode: 'full',
  station: readHashStation(),
  traveling: false,
  pending: null,
  pushedIn: false,
  phase: { ...initialPhase },
  revealStartedAt: null,
  muted: false,
  caption: null,
  narrating: false,
  toast: null,
  nextPulse: 0,
  reducedMotion: prefersReducedMotion(),
  lowPower: false,
  hoverArtifact: false,

  start: (mode) => {
    set({ started: true, mode });
    // The lobby prologue plays in full mode; Quick Tour starts its own clock.
    if (mode === 'full' && get().station === 0) get().inspect();
  },

  stopTour: () => set({ mode: 'full' }),

  goTo: (index) => {
    const s = get();
    if (index < 0 || index >= exhibits.length) return;
    if (s.traveling) {
      // Queue at most one pending input (spec C3).
      set({ pending: index });
      return;
    }
    if (index === s.station && !s.pushedIn) return;
    // Leaving mid-reveal counts as a skip: the visitor inspected it.
    const cur = exhibits[s.station];
    if (s.phase[cur.id] === 'reveal') get().setRecovered(cur.id);
    set({ station: index, traveling: true, pushedIn: false, caption: null, narrating: false, revealStartedAt: null });
  },

  goNext: () => {
    const s = get();
    if (s.traveling) return set({ pending: 'next' });
    get().goTo(Math.min(s.station + 1, exhibits.length - 1));
  },

  goBack: () => {
    const s = get();
    if (s.traveling) return set({ pending: 'back' });
    get().goTo(Math.max(s.station - 1, 0));
  },

  arrive: () => {
    const { pending } = get();
    set({ traveling: false, pending: null });
    if (pending === 'next') get().goNext();
    else if (pending === 'back') get().goBack();
    else if (typeof pending === 'number') get().goTo(pending);
  },

  inspect: () => {
    const s = get();
    if (s.traveling) return;
    const ex = exhibits[s.station];
    if (s.phase[ex.id] === 'reveal') return;
    // Revisit of a recovered exhibit replays narration only (no state reset).
    const phase = s.phase[ex.id] === 'recovered' ? 'recovered' : 'reveal';
    set({
      phase: { ...s.phase, [ex.id]: phase },
      pushedIn: ex.id !== 'lobby' && s.mode === 'full',
      revealStartedAt: performance.now(),
    });
  },

  setRecovered: (id) => {
    const s = get();
    if (s.phase[id] === 'recovered') return;
    const ex = exhibits.find((e) => e.id === id)!;
    set({ phase: { ...s.phase, [id]: 'recovered' } });
    if (ex.counted && s.mode === 'full') {
      get().showToast(site.recoveredToast);
      set({ nextPulse: s.nextPulse + 1 });
    }
  },

  replay: () => {
    const s = get();
    if (s.traveling) return;
    const ex = exhibits[s.station];
    if (s.phase[ex.id] === 'idle') return get().inspect();
    set({ revealStartedAt: performance.now(), pushedIn: ex.id !== 'lobby' && s.mode === 'full' });
  },

  setCaption: (caption) => set({ caption }),
  setNarrating: (narrating) => set({ narrating }),
  showToast: (text) => set({ toast: { text, key: Date.now() } }),
  toggleMute: () => set({ muted: !get().muted }),
  setLowPower: (lowPower) => set({ lowPower }),
  setHoverArtifact: (hoverArtifact) => set({ hoverArtifact }),
}));

/** Keep #station=<id> in the URL hash (spec F1). */
useMuseum.subscribe((s, prev) => {
  if (s.station !== prev.station) {
    history.replaceState(null, '', `#station=${exhibits[s.station].id}`);
  }
});

export const currentExhibit = () => exhibits[useMuseum.getState().station];
