"""Seam checks on a master: is a patched word's background, tone and level in line with the rest of the take?

Usage: python seam_check.py <master wav> <asr json key> <asr json> word[,word...]
Uses the master's own word timings (faster-whisper, from qc_asr.py output) to find each word.
Prints, per word: level (loudest 30 ms, 120-4000 Hz), tilt (dB of 1-4 kHz minus 100-1000 Hz, voiced frames),
and the background level of the pauses right before and after it, next to the same numbers for every
other word of the take (median and 10-90 % range).
"""
import json
import sys

import numpy as np
from scipy.signal import butter, sosfiltfilt, welch

sys.path.insert(0, __file__.rsplit("/", 2)[0])
from common import SR, load, norm_words  # noqa: E402

x = load(sys.argv[1])
words = json.load(open(sys.argv[3]))[sys.argv[2]]["words"]
targets = sys.argv[4].split(",")
sos = butter(4, (120, 4000), btype="band", fs=SR, output="sos")
y = sosfiltfilt(sos, x)


def peak(a, b):
    s = y[int(a * SR) : int(b * SR)]
    n, h = int(0.03 * SR), int(0.005 * SR)
    return 10 * np.log10(max(np.mean(s[i : i + n] ** 2) for i in range(0, max(1, len(s) - n), h)) + 1e-20)


def tilt(a, b):
    s = x[int(a * SR) : int(b * SR)]
    if len(s) < 2048:
        return np.nan
    f, p = welch(s, SR, nperseg=2048)
    hi = p[(f >= 1000) & (f < 4000)].sum()
    lo = p[(f >= 100) & (f < 1000)].sum()
    return 10 * np.log10(hi / lo)


def pause_level(t, side, span=0.12):
    a, b = (t - span - 0.03, t - 0.03) if side == "before" else (t + 0.03, t + 0.03 + span)
    s = x[max(0, int(a * SR)) : int(b * SR)]
    return 10 * np.log10(np.mean(s**2) + 1e-20)


rows = []
for w in words:
    a, b = max(0.0, w["s"]), w["e"]
    if b - a < 0.08:
        continue
    rows.append((norm_words(w["w"]), a, b, peak(a, b), tilt(a, b)))
lv = np.array([r[3] for r in rows])
tl = np.array([r[4] for r in rows if np.isfinite(r[4])])
print(f"all words: level median {np.median(lv):.1f} (10-90 % {np.percentile(lv, 10):.1f}..{np.percentile(lv, 90):.1f}) dBFS, "
      f"tilt median {np.median(tl):.1f} ({np.percentile(tl, 10):.1f}..{np.percentile(tl, 90):.1f}) dB")
gaps = []
for i in range(1, len(words)):
    g0, g1 = words[i - 1]["e"], words[i]["s"]
    if g1 - g0 > 0.3:
        s = x[int((g0 + 0.08) * SR) : int((g1 - 0.08) * SR)]
        gaps.append(10 * np.log10(np.mean(s**2) + 1e-20))
print(f"pauses > 0.3 s: background median {np.median(gaps):.1f} dBFS (10-90 % {np.percentile(gaps, 10):.1f}..{np.percentile(gaps, 90):.1f})")
for t in targets:
    for r in rows:
        if r[0] and r[0][0] == t:
            print(f"  {t:10s} {r[1]:6.2f}-{r[2]:6.2f}  level {r[3]:6.1f}  tilt {r[4]:5.1f}  "
                  f"pause before {pause_level(r[1], 'before'):6.1f}  after {pause_level(r[2], 'after'):6.1f}")
