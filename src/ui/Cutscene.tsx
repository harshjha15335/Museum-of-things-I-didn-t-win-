import { useEffect, useRef, useState } from 'react';
import { cutscene, cutsceneAudio, site } from '../content/exhibits';
import { useMuseum } from '../state/store';
import { say, hush } from '../audio/voice';

const LEAD_IN_MS = 600;

/** Fetch the intro recording while the home screen is up, so the voice starts with the camera. */
let preloaded: HTMLAudioElement | null = null;
export function preloadIntro() {
  if (preloaded || typeof Audio === 'undefined') return;
  preloaded = new Audio(cutsceneAudio);
  preloaded.preload = 'auto';
}

/** Call inside the "Enter" click: Safari only lets an element play later if it was started in a gesture. */
export function primeIntro() {
  preloadIntro();
  const a = preloaded;
  if (!a) return;
  a.muted = true;
  a.play()
    .then(() => {
      if (preloaded === a) {
        a.pause();
        a.currentTime = 0;
      }
    })
    .catch(() => {});
}

/**
 * Opening cutscene: letterboxed title cards over a camera fly-through of the hall
 * (camera moves live in CameraRig, timed by cutscene[].duration). Narrated by Harsh's
 * recording, with each card following the audio clock; if the file can't play, the
 * placeholder voice reads the cards on the content timings instead.
 */
export function Cutscene() {
  const active = useMuseum((s) => s.cutscene);
  const muted = useMuseum((s) => s.muted);
  const [shot, setShot] = useState(0);
  const [synthetic, setSynthetic] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!active) return;
    setShot(0);
    setSynthetic(false);
    let stopped = false;
    let timer: number | undefined;
    let raf = 0;
    const end = () => useMuseum.getState().endCutscene();
    useMuseum.getState().setNarrating(true);

    const audio = preloaded ?? new Audio(cutsceneAudio);
    preloaded = null;
    audio.pause();
    audio.currentTime = 0;
    audio.muted = useMuseum.getState().muted;
    audioRef.current = audio;

    // Recording: the card on screen is the last one whose line has started.
    const follow = () => {
      if (stopped) return;
      const t = audio.currentTime;
      let k = 0;
      for (let j = 0; j < cutscene.length; j++) if (t >= cutscene[j].start) k = j;
      setShot(k);
      if (audio.ended) {
        timer = window.setTimeout(end, 900);
        return;
      }
      raf = requestAnimationFrame(follow);
    };

    // Fallback: placeholder voice, card by card.
    let i = 0;
    const timed = () => {
      if (stopped) return;
      if (i >= cutscene.length) return end();
      setShot(i);
      if (!useMuseum.getState().muted) void say(cutscene[i].line);
      timer = window.setTimeout(() => {
        i++;
        timed();
      }, cutscene[i].duration * 1000);
    };

    // Short lead-in before the voice: the opening word lands after the audio output has woken up (Bluetooth
    // outputs drop the first few hundred ms) and the first frame is on screen.
    const lead = window.setTimeout(() => {
      if (stopped) return;
      audio
        .play()
        .then(() => {
          if (!stopped) follow();
        })
        .catch(() => {
          if (stopped) return;
          audioRef.current = null;
          setSynthetic(true);
          timed();
        });
    }, LEAD_IN_MS);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') end();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      stopped = true;
      window.clearTimeout(lead);
      window.clearTimeout(timer);
      cancelAnimationFrame(raf);
      audio.pause();
      audioRef.current = null;
      window.removeEventListener('keydown', onKey);
      hush();
      useMuseum.getState().setNarrating(false);
    };
  }, [active]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = muted;
    if (muted) hush();
  }, [muted]);

  if (!active) return null;
  const s = cutscene[shot];
  return (
    <div className="cutscene" role="dialog" aria-label="Intro">
      <div className="letterbox top" />
      <div className="letterbox bottom" />
      <div className="cut-card" key={shot}>
        {s.kicker && <div className="kicker">{s.kicker}</div>}
        <p className="cut-line">{s.line}</p>
      </div>
      <div className="cut-progress" aria-hidden>
        {cutscene.map((_, i) => (
          <span key={i} className={i <= shot ? 'on' : ''} />
        ))}
      </div>
      <button className="ui-btn cut-skip" onClick={() => useMuseum.getState().endCutscene()}>
        {site.skipIntro.toUpperCase()}
      </button>
      {synthetic && <span className="voice-note">{site.synthVoiceNote}</span>}
    </div>
  );
}
