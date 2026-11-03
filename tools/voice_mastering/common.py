"""Shared helpers for the narration mastering pipeline (48 kHz float mono throughout)."""
import numpy as np
import pyloudnorm as pyln
import soundfile as sf
from scipy.signal import butter, firwin, firwin2, fftconvolve, resample_poly, sosfiltfilt

SR = 48000

# Section name -> original upload (names are upload ids, so sections are identified by content via ASR).
FILES = {
    "00-intro": "faa096a7-8a7e-4b9f-9c04-37ce2dfef073.wav",
    "00-lobby": "80cfea39-f23c-41d5-94d2-bc26d345e4f0.wav",
    "01-samsung": "e2c0f8b4-d95d-4038-9c60-5bd17ab7ed7b.wav",
    "02-hackerrank": "6c5ad87a-c559-4187-9b3e-bdb66bf14c11.wav",
    "03-gsoc": "93845e5f-1168-4381-a19c-5c47213ed27a.wav",
    "04-deadline": "7279248e-7c60-45cd-8770-5dac31551224.wav",
    "05-vault": "319a0619-44a1-4fe3-9e82-be72a28e6160.wav",
}

# Edit decisions, in ORIGINAL file time (seconds). Found from word timings + energy segments.
#  cut: remove [a, b) (boundaries are snapped to the quietest 10 ms within +-80 ms, 20 ms crossfade)
#  pause: insert extra silence (s) at time t, to separate two phrases that run together
EDITS = {
    # "Lights down. Doors locked." is rushed (ASR hears "Ladies and gentlemen"): open the gap a little.
    # It is also spoken about 14 dB softer than the next words (DeepFilterNet took it for noise, and 90 % gating
    # thinned its consonants), so it gets +8 dB clip gain and only 50 % gating ("protect").
    "00-intro": {"cuts": [], "pauses": [(0.87, 0.22)], "gain": [(0.40, 0.86, 8.0)], "protect": [(0.36, 0.90, 0.5)]},
    "00-lobby": {"cuts": [], "pauses": []},
    "01-samsung": {"cuts": [], "pauses": []},
    "02-hackerrank": {"cuts": [], "pauses": []},
    "03-gsoc": {"cuts": [], "pauses": []},
    # First, incomplete take of "Give me five days and I used to spend three thinking" (4.06-7.0); keep the retake.
    "04-deadline": {"cuts": [(3.68, 8.02)], "pauses": []},
    # 0-10.85: an app chime plus the first take of "Case file five. The vault." (kept: the retake at 11.1).
    # 18.20-19.95: a false start, "We saved the..." (18.36-19.04), before the full line at 20.06
    #   (found by forced alignment: the caption sat 2.3 s early).
    # 21.54-34.30: first take of "Inside... I build it." (the retake adds "and I run it").
    "05-vault": {"cuts": [(0.0, 10.85), (18.20, 19.95), (21.54, 34.30)], "pauses": [(12.70, 0.25)]},
}


def load(path, sr=SR):
    x, r = sf.read(path, dtype="float64", always_2d=True)
    x = x.mean(axis=1)
    if r != sr:
        from math import gcd

        g = gcd(r, sr)
        x = resample_poly(x, sr // g, r // g)
    return x


def save(path, x, sr=SR, subtype="PCM_24"):
    sf.write(path, np.clip(x, -1, 1), sr, subtype=subtype)


def lufs(x, sr=SR):
    return pyln.Meter(sr).integrated_loudness(x)


def true_peak_db(x):
    return 20 * np.log10(np.max(np.abs(resample_poly(x, 4, 1))) + 1e-12)


def gain_to_lufs(x, target, sr=SR):
    return x * 10 ** ((target - lufs(x, sr)) / 20)


def highpass(x, fc, order=4, sr=SR):
    sos = butter(order, fc, btype="high", fs=sr, output="sos")
    return sosfiltfilt(sos, x)


def frame_db(x, sr=SR, win=0.02, band=(120, 4000)):
    sos = butter(4, band, btype="band", fs=sr, output="sos")
    y = sosfiltfilt(sos, x)
    n = int(win * sr)
    fr = y[: len(y) // n * n].reshape(-1, n)
    return 20 * np.log10(np.sqrt((fr**2).mean(1)) + 1e-10)


def speech_segments(x, sr=SR, thr=12, merge=0.18, minlen=0.06):
    db = frame_db(x, sr)
    floor = np.percentile(db, 10)
    on = db > floor + thr
    segs, i = [], 0
    while i < len(on):
        if on[i]:
            j = i
            while j < len(on) and on[j]:
                j += 1
            segs.append([i * 0.02, j * 0.02])
            i = j
        else:
            i += 1
    out = []
    for s, e in segs:
        if out and s - out[-1][1] < merge:
            out[-1][1] = e
        else:
            out.append([s, e])
    return [(s, e) for s, e in out if e - s >= minlen]


def quietest_near(x, t, sr=SR, span=0.08):
    """Time of the quietest 10 ms window within +-span of t."""
    a, b = max(0, int((t - span) * sr)), min(len(x), int((t + span) * sr))
    n = int(0.01 * sr)
    if b - a <= n:
        return t
    e = np.convolve(x[a:b] ** 2, np.ones(n), "valid")
    return (a + int(np.argmin(e)) + n // 2) / sr


def splice(parts, sr=SR, xf=0.02):
    """Join pieces with short equal-power crossfades."""
    n = int(xf * sr)
    out = parts[0].copy()
    for p in parts[1:]:
        if len(out) < n or len(p) < n:
            out = np.concatenate([out, p])
            continue
        t = np.linspace(0, np.pi / 2, n)
        mid = out[-n:] * np.cos(t) + p[:n] * np.sin(t)
        out = np.concatenate([out[:-n], mid, p[n:]])
    return out


def fir_eq(x, freqs_hz, gains_db, sr=SR, numtaps=4097):
    """Linear-phase FIR EQ through (freq, gain) points; zero-latency (delay compensated)."""
    f = np.r_[0, np.asarray(freqs_hz, float), sr / 2] / (sr / 2)
    g = np.r_[gains_db[0], np.asarray(gains_db, float), gains_db[-1]]
    h = firwin2(numtaps, f, 10 ** (g / 20))
    y = fftconvolve(x, h)[numtaps // 2 : numtaps // 2 + len(x)]
    return y


def split_high(x, fc, sr=SR, numtaps=1023):
    """Complementary linear-phase split: returns (low, high) with low + high == x."""
    h = firwin(numtaps, fc, fs=sr, pass_zero=False)
    hi = fftconvolve(x, h)[numtaps // 2 : numtaps // 2 + len(x)]
    return x - hi, hi


# What Harsh actually says in each take that is kept (from the original recordings, checked against the
# script). Used only to score speech recognition before vs after processing (word error rate).
REFERENCE = {
    "00-intro": "Lights down. Doors locked. Welcome to the Harsh Jha Museum of Near Misses. Other museums guard "
    "their trophies. This one guards the near misses, hackathons, bets and plans that didn't land. Harsh Jha, "
    "computer science student, VIT Vellore. Known risk, still hasn't learned to play it safe. Five case files, "
    "each one a call I made, what broke and what I kept. Confidence is not evidence. So tonight we go get the evidence.",
    "00-lobby": "Welcome to the museum of near misses. I am Harsh, founder, curator and prime suspect in most of "
    "these exhibits. Some people collect trophies. I collect character development. Five case files. Let's open them.",
    "01-samsung": "Case file one. ASTFLOW. Three friends, one Samsung Prism Gen AI hackathon, one idea. Make huge "
    "JavaScript code bases readable to the developers stuck inside them. No more pasting snippets into chatbots and "
    "praying. My job, the user flow and retrieval. We built it during exams, notes in one window, code in the other. "
    "We were sure we'd qualify. We didn't. No reason was given and I'm not going to make one up. But one question "
    "still follows me. Did we validate as hard as we built?",
    "02-hackerrank": "Case file two. HackerRank Orchestrate. Codex, Claude, Gemini. More AI in one room than any sane "
    "person should allow. I thought running them all at once was my edge. In my head I was already near the top. "
    "I hit submit with validation errors still on the screen. Then the AI interview found gaps I couldn't explain. "
    "I had mistaken access to powerful tools for certainty about my result. More isn't better. Judgment is.",
    "03-gsoc": "Case file three. This one's technically in the wrong museum. Applying to Google Summer of Code, I was "
    "scared my real strength, coordinating AI tools, would look like a weakness. I used it anyway. Carefully this "
    "time. Selected, GSoC 2026 with QC Devs. Three months learning what contributing to real open source actually "
    "means. No single heroic line of code here. Same tools, better judgment.",
    "04-deadline": "Case file four. The least flattering room in the building. Give me five days and I used to spend "
    "three thinking I had lots of time. Then cut features. Then obsess over every detail on the last night. So I "
    "changed one rule. What has to be finished today gets finished today. Hours don't count. Done does. And yes, I "
    "see the irony of saying this in a timed hiring challenge.",
    "05-vault": "Case file five. The vault. Every museum keeps one thing off the main floor. This is ours. Our best "
    "kept secret. We saved the best for last. Inside, the Wispr Flow campaign I ran during this challenge. I am a "
    "computer science student, applying to a growth team. My edge in growth, I don't just suggest the experiment, "
    "I build it and I run it. And I built this whole museum by voice. This museum has no ending yet. That's why I am applying.",
}

# Fragile words and phrases to check one by one in every version.
WATCH = {
    "00-intro": ["lights down", "doors locked", "near misses", "bets and plans", "vellore"],
    "00-lobby": ["near misses", "i am harsh", "character development"],
    "01-samsung": ["case file one", "astflow", "we didn't", "chatbots"],
    "02-hackerrank": ["case file two", "orchestrate", "submit", "judgment is"],
    "03-gsoc": ["case file three", "qc devs", "better judgment"],
    "04-deadline": ["case file four", "lots of time", "timed hiring challenge"],
    "05-vault": ["case file five", "the vault", "whisper flow", "i run it", "i am applying"],
}

_NUM = {"1": "one", "2": "two", "3": "three", "4": "four", "5": "five"}
_SUBS = {"wispr": "whisper", "judgement": "judgment", "codebases": "code bases", "hackerrank": "hacker rank",
         "genai": "gen ai", "qcdevs": "qc devs", "qcdev": "qc devs", "i'm": "i am", "i'd": "i had",
         "one's": "one is", "chatbot": "chatbots"}


def norm_words(s):
    import re

    s = re.sub(r"[^a-z0-9' ]+", " ", s.lower().replace("-", " "))
    out = []
    for w in s.split():
        w = w.strip("'")
        w = _NUM.get(w, w)
        out.extend(_SUBS.get(w, w).split())
    return out


def wer(ref, hyp):
    r, h = norm_words(ref), norm_words(hyp)
    d = list(range(len(h) + 1))
    for i in range(1, len(r) + 1):
        prev, d[0] = d[0], i
        for j in range(1, len(h) + 1):
            cur = min(d[j] + 1, d[j - 1] + 1, prev + (r[i - 1] != h[j - 1]))
            prev, d[j] = d[j], cur
    return d[len(h)] / max(1, len(r))


def has_phrase(hyp, phrase):
    h, p = norm_words(hyp), norm_words(phrase)
    return any(h[i : i + len(p)] == p for i in range(len(h) - len(p) + 1))
