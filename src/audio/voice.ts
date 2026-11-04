/**
 * Placeholder narrator voice using the browser's speech synthesis, used only until
 * Harsh's own recordings exist (spec C6 wants his voice). Clearly labelled in the UI.
 */
let chosen: SpeechSynthesisVoice | null = null;

export const voiceSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

function pickVoice() {
  if (!voiceSupported()) return null;
  if (chosen) return chosen;
  const voices = window.speechSynthesis.getVoices();
  const prefer = [/en-IN/i, /en-GB/i, /en-US/i, /^en/i];
  for (const re of prefer) {
    const v = voices.find((x) => re.test(x.lang) && !/female/i.test(x.name)) ?? voices.find((x) => re.test(x.lang));
    if (v) {
      chosen = v;
      return v;
    }
  }
  return voices[0] ?? null;
}

if (voiceSupported()) {
  window.speechSynthesis.onvoiceschanged = () => {
    chosen = null;
    pickVoice();
  };
}

/** Speak one line; resolves when finished, cancelled or failed (never rejects). */
export function say(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (!voiceSupported()) return resolve();
    const u = new SpeechSynthesisUtterance(text);
    const v = pickVoice();
    if (v) u.voice = v;
    u.rate = 0.98;
    u.pitch = 0.95;
    u.volume = 1;
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        resolve();
      }
    };
    u.onend = finish;
    u.onerror = finish;
    // Safety: some engines never fire onend.
    window.setTimeout(finish, 2500 + text.split(/\s+/).length * 600);
    window.speechSynthesis.speak(u);
  });
}

export function hush() {
  if (voiceSupported()) window.speechSynthesis.cancel();
}
