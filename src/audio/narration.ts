import { exhibits, type Exhibit } from '../content/exhibits';
import { useMuseum } from '../state/store';

/**
 * Narration + caption clock (spec C6).
 * Uses the audio element's currentTime when a recording exists and loads;
 * otherwise a timer (cue timings in the content file were initialised at 2.6 words/s).
 * Muted: captions keep running on their timings.
 */
class Narrator {
  private raf = 0;
  private t0 = 0;
  private audio: HTMLAudioElement | null = null;
  private useAudio = false;
  private exhibit: Exhibit | null = null;
  private cueIndex = -1;
  private paused = false;
  private pausedAt = 0;
  private onDone: (() => void) | null = null;

  start(ex: Exhibit, onDone: () => void) {
    this.stop();
    this.exhibit = ex;
    this.onDone = onDone;
    this.cueIndex = -1;
    this.paused = false;
    this.t0 = performance.now();
    this.useAudio = false;
    if (ex.audio) {
      const a = new Audio(ex.audio);
      a.muted = useMuseum.getState().muted;
      this.audio = a;
      a.play()
        .then(() => {
          // Switch the clock to the audio's own time once it really plays.
          if (this.audio === a) this.useAudio = true;
        })
        .catch(() => {
          // Missing file or blocked: silently stay on the timer clock.
          if (this.audio === a) this.audio = null;
        });
      a.addEventListener('error', () => {
        if (this.audio === a) {
          this.audio = null;
          this.useAudio = false;
        }
      });
    }
    useMuseum.getState().setNarrating(true);
    this.tick();
  }

  private time() {
    if (this.useAudio && this.audio) return this.audio.currentTime;
    if (this.paused) return this.pausedAt;
    return (performance.now() - this.t0) / 1000;
  }

  private tick = () => {
    const ex = this.exhibit;
    if (!ex) return;
    const t = this.time();
    const cues = ex.narration;
    let idx = -1;
    for (let i = 0; i < cues.length; i++) {
      if (t >= cues[i].start && t < cues[i].end + 0.25) idx = i;
    }
    if (idx !== this.cueIndex) {
      this.cueIndex = idx;
      useMuseum.getState().setCaption(idx >= 0 ? { text: cues[idx].text, key: `${ex.id}-${idx}` } : null);
    }
    const last = cues[cues.length - 1];
    const ended = this.useAudio && this.audio ? this.audio.ended || t > last.end + 0.4 : t > (last?.end ?? 0) + 0.4;
    if (ended) {
      const done = this.onDone;
      this.stop();
      done?.();
      return;
    }
    this.raf = requestAnimationFrame(this.tick);
  };

  setMuted(m: boolean) {
    if (this.audio) this.audio.muted = m;
  }

  /** Current narration time in seconds (for room animations keyed to cues). */
  now() {
    return this.exhibit ? this.time() : 0;
  }

  get activeId() {
    return this.exhibit?.id ?? null;
  }

  stop() {
    cancelAnimationFrame(this.raf);
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

/** Wire the narrator to store changes. Call once at startup. */
export function initNarration() {
  useMuseum.subscribe((s, prev) => {
    if (s.muted !== prev.muted) narrator.setMuted(s.muted);

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

