"""Pitch contours (WORLD harvest, 10 ms) of the pick-up words after de-humming, next to the same words in the takes.

Usage: python pitch_compare.py <vm dir>
"""
import json
import os
import sys

import numpy as np
import pyworld as pw
from scipy.signal import filtfilt, iirnotch

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from common import FILES, SR, highpass, load  # noqa: E402

VM = sys.argv[1]
M = json.load(open(os.path.join(VM, "work/patch/measure.json")))


def dehum(x, freqs=(100.3,), q=30.0):
    for f in freqs:
        b, a = iirnotch(f, q, SR)
        x = filtfilt(b, a, x)
    return highpass(x, 70, order=4)


X = {
    "pick": dehum(load(os.path.join(VM, "originals", "64859716-1487-4473-973d-e8aa78f483db.wav"))),
    "samsung": highpass(load(os.path.join(VM, "originals", FILES["01-samsung"])), 70, order=4),
    "deadline": highpass(load(os.path.join(VM, "originals", FILES["04-deadline"])), 70, order=4),
}
F0 = {}
for name, x in X.items():
    f0, t = pw.harvest(np.ascontiguousarray(x, dtype=np.float64), SR, f0_floor=60, f0_ceil=300, frame_period=10)
    F0[name] = (t, f0)


def contour(name, a, b):
    t, f0 = F0[name]
    m = (t >= a) & (t <= b)
    return t[m], f0[m]


def st(f):
    return 12 * np.log2(f / 100.0)


rows = {}
for k, v in M["words"].items():
    name = k.split("(")[1].split(",")[0].rstrip(")")
    a, b = v["span"]
    t, f = contour(name, a, b)
    voiced = f[f > 0]
    rows[k] = voiced
    print(f"{k:24s} [{a:.2f}-{b:.2f}] n{len(voiced):3d} med {np.median(voiced) if len(voiced) else 0:6.1f} Hz  "
          + " ".join(f"{x:.0f}" for x in voiced))


def med(k):
    return float(np.median(rows[k]))


print()
for pk, hk in (("we(pick)", "we(samsung,2nd 'we')"), ("didnt(pick)", "didnt(samsung)"),
               ("astflow1(pick)", "astflow(samsung)"), ("astflow3(pick)", "astflow(samsung)"),
               ("hiring(pick)", "hiring(deadline)"), ("challenge(pick)", "challenge(deadline)")):
    print(f"{pk:16s} vs {hk:22s}: {st(med(pk)) - st(med(hk)):+.1f} semitones")
