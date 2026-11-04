import gsap from 'gsap';
import { suspendMusic, resumeMusic } from './music';

/**
 * Phone audio rules (mobile audit, 4 Nov).
 *  - iOS 17+: ask for a "playback" audio session inside the Enter tap, so the Web Audio music isn't
 *    silenced by the ring/silent switch while the narration (an <audio> element) plays.
 *  - Leaving the tab or locking the phone pauses the voice, the music and the camera timeline together,
 *    and coming back resumes them in step (gsap runs with lagSmoothing(0), so without the pause the
 *    cutscene camera would jump ahead of the voice).
 *  - iOS can leave the AudioContext "interrupted" after a call or Siri; any tap resumes it.
 */
const voices = new Set<HTMLAudioElement>();
const pausedByUs = new Set<HTMLAudioElement>();

/** Register a narration/cutscene element that is about to play. */
export function trackVoice(a: HTMLAudioElement) {
  voices.add(a);
  const drop = () => voices.delete(a);
  a.addEventListener('ended', drop, { once: true });
  a.addEventListener('error', drop, { once: true });
}

/** Call inside the first user gesture. */
export function unlockAudioSession() {
  try {
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
    if (session) session.type = 'playback';
  } catch {
    /* not supported */
  }
}

function retryOnTap(a: HTMLAudioElement) {
  const go = () => {
    void a.play().catch(() => {});
  };
  window.addEventListener('pointerdown', go, { once: true, capture: true });
}

function onHidden() {
  gsap.globalTimeline.pause();
  suspendMusic();
  for (const a of voices) {
    if (!a.paused && !a.ended) {
      a.pause();
      pausedByUs.add(a);
    }
  }
}

function onVisible() {
  gsap.globalTimeline.resume();
  resumeMusic();
  for (const a of pausedByUs) {
    a.play().catch(() => retryOnTap(a));
  }
  pausedByUs.clear();
}

let wired = false;
export function initAudioLifecycle() {
  if (wired || typeof document === 'undefined') return;
  wired = true;
  document.addEventListener('visibilitychange', () => (document.hidden ? onHidden() : onVisible()));
  // bfcache restore on iOS Safari
  window.addEventListener('pageshow', (e) => {
    if ((e as PageTransitionEvent).persisted) onVisible();
  });
  window.addEventListener('pointerdown', () => !document.hidden && resumeMusic(), { capture: true, passive: true });
}
