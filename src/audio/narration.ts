import { exhibits, type Exhibit } from '../content/exhibits';
import { useMuseum } from '../state/store';
import { say, hush, voiceSupported } from './voice';
import { setMusicLevel, sting } from './music';

/**
 * Narration + caption clock (spec C6).
 *  audio — Harsh's recording (when `audio` is set and the file plays); clock = audio time
 *  voice — placeholder speech synthesis, cue by cue, until recordings exist
 *  timer — muted / no speech: cue timings from the content file (2.6 words/s)
 * Captions and the reading panel highlight follow whichever clock runs.
 */
const primed = new Map<string, HTMLAudioElement>();

/**
 * Start (and at once pause) a recording inside a user gesture, so it may play later from a timer:
 * the lobby prologue begins on its own when the intro ends, and Safari blocks unprimed elements.
 */
export function primeNarration(src: string | undefined) {
  if (!src || primed.has(src) || typeof Audio === 'undefined') return;
  const a = new Audio(src);
  a.preload = 'auto';
  a.muted = true;
  primed.set(src, a);
  a.play()
    .then(() => {
      if (primed.get(src) === a) {
        a.pause();
        a.currentTime = 0;
      }
    })
    .catch(() => {});
}

/** Start downloading a room's recording before the visitor inspects it. */
function prefetchNarration(src: string | undefined) {
  if (!src || primed.has(src) || typeof Audio === 'undefined') return;
  const a = new Audio(src);
  a.preload = 'auto';
  primed.set(src, a);
}

class Narrator {
  private raf = 0;
  private audio: HTMLAudioElement | null = null;
  private useAudio = false;
  private exhibit: Exhibit | null = null;
  private cueIndex = -1;
  private onDone: (() => void) | null = null;
  private run = 0; // generation counter so stale async loops stop

  start(ex: Exhibit, onDone: () => void) {
    this.stop();
    this.exhibit = ex;
    this.onDone = onDone;
    this.cueIndex = -1;
    this.useAudio = false;
    const gen = ++this.run;
    useMuseum.getState().setNarrating(true);

    if (ex.audio) {
      const a = primed.get(ex.audio) ?? new Audio(ex.audio);
      primed.delete(ex.audio);
      a.currentTime = 0;
      a.muted = useMuseum.getState().muted;
      this.audio = a;
      a.play()
        .then(() => {
          if (this.audio === a) this.useAudio = true;
        })
        .catch(() => {
          if (this.audio === a) this.audio = null;
          if (this.run === gen) this.voiceLoop(gen);
        });
      a.addEventListener('error', () => {
        if (this.audio === a) {
          this.audio = null;
          this.useAudio = false;
        }
      });
      this.tick();
      return;
    }
    this.voiceLoop(gen);
  }

  /** Speak cue by cue; when muted (or no speech engine) wait out each cue's timing instead. */
  private async voiceLoop(gen: number) {
    const ex = this.exhibit;
    if (!ex) return;
    const cues = ex.narration;
    for (let i = 0; i < cues.length; i++) {
      if (this.run !== gen) return;
      this.setCue(ex, i);
      const minMs = (cues[i].end - cues[i].start) * 1000;
      const started = performance.now();
      const muted = useMuseum.getState().muted;
      if (!muted && voiceSupported()) await say(cues[i].text);
      const left = (muted || !voiceSupported() ? minMs : 250) - (performance.now() - started);
      if (left > 0) await new Promise((r) => window.setTimeout(r, left));
    }
    if (this.run !== gen) return;
    const done = this.onDone;
    this.stop();
    done?.();
  }

  private setCue(ex: Exhibit, idx: number) {
    if (idx === this.cueIndex) return;
    this.cueIndex = idx;
    const s = useMuseum.getState();
    s.setCaption(idx >= 0 ? { text: ex.narration[idx].text, key: `${ex.id}-${idx}` } : null);
    s.setCueIndex(idx);
  }

  private tick = () => {
    const ex = this.exhibit;
    if (!ex) return;
    if (!this.useAudio || !this.audio) {
      if (this.audio) this.raf = requestAnimationFrame(this.tick); // still loading
      return;
    }
    const t = this.audio.currentTime;
    const cues = ex.narration;
    // Hold each caption until the next line starts (short pauses don't blink it off).
    let idx = -1;
    for (let i = 0; i < cues.length; i++) if (t >= cues[i].start - 0.05) idx = i;
    if (idx >= 0 && t > cues[idx].end + 1.2) idx = -1;
    this.setCue(ex, idx);
    if (this.audio.ended) {
      const done = this.onDone;
      this.stop();
      done?.();
      return;
    }
    this.raf = requestAnimationFrame(this.tick);
  };

  setMuted(m: boolean) {
    if (this.audio) this.audio.muted = m;
    if (m) hush();
  }

  stop() {
    this.run++;
    cancelAnimationFrame(this.raf);
    hush();
    if (this.audio) {
      this.audio.pause();
      this.audio = null;
    }
    this.useAudio = false;
    this.exhibit = null;
    this.onDone = null;
    this.cueIndex = -1;
    const s = useMuseum.getState();
    if (s.caption) s.setCaption(null);
    if (s.narrating) s.setNarrating(false);
    if (s.cueIndex !== -1) s.setCueIndex(-1);
  }

  skip() {
    const done = this.onDone;
    this.stop();
    done?.();
  }
}

export const narrator = new Narrator();

let quickTimer: number | undefined;

/** One-line caption for Quick Tour; auto-advances after the dwell. */
function runQuickStop(index: number) {
  window.clearTimeout(quickTimer);
  const ex = exhibits[index];
  const s = useMuseum.getState();
  s.setCaption({ text: ex.quickLine, key: `quick-${ex.id}` });
  s.setRecovered(ex.id);
  if (index === exhibits.length - 1) return; // the vault stays open
  const dwell = ex.id === 'corridor' ? 5000 : 11000;
  quickTimer = window.setTimeout(() => {
    const st = useMuseum.getState();
    if (st.mode !== 'quick') return;
    st.setCaption(null);
    st.goNext();
  }, dwell);
}

function musicLevel() {
  const s = useMuseum.getState();
  if (!s.started || s.muted || !s.musicOn) return setMusicLevel('off');
  setMusicLevel(s.narrating ? 'bed' : 'full');
}

/** Wire the narrator to store changes. Call once at startup. */
export function initNarration() {
  useMuseum.subscribe((s, prev) => {
    if (s.muted !== prev.muted) narrator.setMuted(s.muted);
    if (s.muted !== prev.muted || s.narrating !== prev.narrating || s.musicOn !== prev.musicOn || s.started !== prev.started)
      musicLevel();

    // Recovery chime for counted rooms.
    for (const ex of exhibits) {
      if (ex.counted && s.phase[ex.id] === 'recovered' && prev.phase[ex.id] !== 'recovered' && s.mode === 'full') sting();
    }

    // Fetch this room's recording (and the next one's) while the camera travels.
    if (s.started && (s.station !== prev.station || !prev.started)) {
      prefetchNarration(exhibits[s.station]?.audio);
      prefetchNarration(exhibits[s.station + 1]?.audio);
    }

    // Leaving a station stops whatever was playing.
    if (s.station !== prev.station) {
      narrator.stop();
      window.clearTimeout(quickTimer);
    }

    // Quick Tour: run a stop on each arrival (and on tour start).
    const quickArrived = s.mode === 'quick' && !s.traveling && (prev.traveling || prev.mode !== 'quick' || !prev.started);
    if (quickArrived && s.started) {
      narrator.stop();
      runQuickStop(s.station);
    }

    // Leaving Quick Tour ("Stop tour"): keep the visitor at the current station.
    if (prev.mode === 'quick' && s.mode === 'full') {
      window.clearTimeout(quickTimer);
      s.setCaption(null);
    }

    // Full mode: an inspect starts narration.
    if (s.mode === 'full' && s.revealStartedAt !== null && s.revealStartedAt !== prev.revealStartedAt) {
      const ex = exhibits[s.station];
      if (ex.narration.length === 0) {
        useMuseum.getState().setRecovered(ex.id);
        return;
      }
      narrator.start(ex, () => useMuseum.getState().setRecovered(ex.id));
    }
  });
}
