/**
 * Original generative background music (Web Audio, no files, no licences):
 * a slow minor pad with soft bell notes, an after-hours museum mood.
 * Ducks ~15 dB under narration (spec C6); everything off when muted.
 */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let bus: GainNode | null = null;
let timer: number | undefined;
const BASE = 0.11;

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
// A minor → F → C → E minor, low register
const CHORDS = [
  [45, 52, 57, 60, 64],
  [41, 48, 53, 57, 60],
  [36, 43, 48, 52, 55],
  [40, 47, 52, 55, 59],
];
const BELLS = [69, 72, 74, 76, 79, 81];

function pad(at: number, notes: number[], dur: number) {
  if (!ctx || !bus) return;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(0.16, at + 3);
  g.gain.linearRampToValueAtTime(0.12, at + dur - 2);
  g.gain.linearRampToValueAtTime(0, at + dur + 2.5);
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.setValueAtTime(500, at);
  f.frequency.linearRampToValueAtTime(900, at + dur / 2);
  f.frequency.linearRampToValueAtTime(450, at + dur);
  f.connect(g).connect(bus);
  for (const n of notes) {
    for (const det of [-6, 6]) {
      const o = ctx.createOscillator();
      o.type = n < 50 ? 'sine' : 'triangle';
      o.frequency.value = midi(n);
      o.detune.value = det;
      o.connect(f);
      o.start(at);
      o.stop(at + dur + 3);
    }
  }
}

function bell(at: number, n: number, vol = 0.05) {
  if (!ctx || !bus) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sine';
  o.frequency.value = midi(n);
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(vol, at + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 3.5);
  o.connect(g).connect(bus);
  o.start(at);
  o.stop(at + 3.6);
}

let bar = 0;
function schedule() {
  if (!ctx) return;
  const BAR = 8;
  const at = ctx.currentTime + 0.1;
  pad(at, CHORDS[bar % CHORDS.length], BAR);
  for (let i = 0; i < 3; i++) {
    if (Math.random() < 0.6) bell(at + 1 + Math.random() * (BAR - 2), BELLS[Math.floor(Math.random() * BELLS.length)]);
  }
  bar++;
  timer = window.setTimeout(schedule, BAR * 1000);
}

/** Start on a user gesture (the ENTER click). Safe to call repeatedly. */
export function startMusic() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0;
      // simple feedback delay for space
      const delay = ctx.createDelay(2);
      delay.delayTime.value = 0.42;
      const fb = ctx.createGain();
      fb.gain.value = 0.35;
      bus = ctx.createGain();
      bus.connect(master);
      bus.connect(delay);
      delay.connect(fb).connect(delay);
      delay.connect(master);
      master.connect(ctx.destination);
      schedule();
    }
    void ctx.resume();
  } catch {
    /* audio unavailable: silent */
  }
}

let target = 0;
/** level: 'off' | 'bed' (under narration) | 'full' */
export function setMusicLevel(level: 'off' | 'bed' | 'full') {
  if (!ctx || !master) return;
  target = level === 'off' ? 0 : level === 'bed' ? BASE * 0.18 : BASE;
  master.gain.cancelScheduledValues(ctx.currentTime);
  master.gain.setTargetAtTime(target, ctx.currentTime, 0.6);
}

/** Soft chime when an artifact is recovered. */
export function sting() {
  if (!ctx || target === 0) return;
  const at = ctx.currentTime + 0.02;
  [76, 81, 88].forEach((n, i) => bell(at + i * 0.09, n, 0.09));
}

export function stopMusic() {
  window.clearTimeout(timer);
}
