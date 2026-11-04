"""Tone difference from spectral ENVELOPES (WORLD CheapTrick, pitch-adaptive, so a different pitch doesn't
masquerade as an EQ difference), on the same vowels in the pick-up and the takes. Prints 1/3-octave dB.

Usage: python envelope_match.py <vm dir>
"""
import os
import sys

import numpy as np
import pyworld as pw
from scipy.signal import filtfilt, iirnotch

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from common import FILES, SR, highpass, load  # noqa: E402

VM = sys.argv[1]
b, a = iirnotch(100.3, 30.0, SR)
P = highpass(filtfilt(b, a, load(os.path.join(VM, "originals", "64859716-1487-4473-973d-e8aa78f483db.wav"))), 70)
S = highpass(load(os.path.join(VM, "originals", FILES["01-samsung"])), 70)
D = highpass(load(os.path.join(VM, "originals", FILES["04-deadline"])), 70)
BANDS = [100, 125, 160, 200, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600, 2000, 2500, 3150, 4000, 5000, 6300]


def env_db(x, t0, t1):
    seg = np.ascontiguousarray(x[int((t0 - 0.05) * SR) : int((t1 + 0.05) * SR)])
    f0, t = pw.harvest(seg, SR, f0_floor=60, f0_ceil=300, frame_period=5)
    sp = pw.cheaptrick(seg, f0, t, SR)
    m = (t >= 0.05) & (t <= 0.05 + t1 - t0) & (f0 > 0)
    e = 10 * np.log10(sp[m] + 1e-20).mean(0)
    f = np.linspace(0, SR / 2, sp.shape[1])
    return np.array([e[(f >= fc / 2 ** (1 / 6)) & (f < fc * 2 ** (1 / 6))].mean() for fc in BANDS]), int(m.sum())


pairs = [
    ("we /i/", P, (1.80, 2.02), S, (23.95, 24.06)),
    ("di /I/", P, (2.16, 2.29), S, (24.10, 24.16)),
    ("AST /ae/", P, (8.78, 8.95), S, (2.07, 2.20)),
    ("FLOW /ou/", P, (9.18, 9.38), S, (2.30, 2.48)),
    ("hiring /ai/", P, (6.00, 6.30), D, (25.46, 25.70)),
    ("challenge", P, (6.50, 6.85), D, (25.85, 26.10)),
]
print(f"{'':12s}" + " ".join(f"{b:>5d}" for b in BANDS))
rows = []
for name, x1, s1, x2, s2 in pairs:
    e1, n1 = env_db(x1, *s1)
    e2, n2 = env_db(x2, *s2)
    d = e2 - e1
    d -= d[BANDS.index(1000)]
    rows.append(d)
    print(f"{name:12s}" + " ".join(f"{v:+5.1f}" for v in d) + f"   frames {n1}/{n2}")
w = np.array([1, 0.5, 1, 0.5, 1, 0.3])
m = (np.array(rows) * w[:, None]).sum(0) / w.sum()
print(f"{'weighted':12s}" + " ".join(f"{v:+5.1f}" for v in m))
print(f"{'median':12s}" + " ".join(f"{v:+5.1f}" for v in np.median(rows, 0)))
