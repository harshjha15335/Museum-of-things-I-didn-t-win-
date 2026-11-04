"""Tone difference between the de-hummed, denoised pick-up and the takes, on the same words (1/3-octave, speech frames).

Usage: python patch_tone.py <vm dir>
"""
import os
import sys

import numpy as np
import torch
from df.enhance import enhance, init_df
from scipy.signal import filtfilt, iirnotch, welch

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from common import FILES, SR, highpass, load, save  # noqa: E402

VM = sys.argv[1]
model, df_state, _ = init_df()


def dehum(x):
    b, a = iirnotch(100.3, 30.0, SR)
    return highpass(filtfilt(b, a, x), 70, order=4)


def room_tone(x, secs=2.0, win=0.4):
    n, hop = int(win * SR), int(0.02 * SR)
    e = np.convolve(x**2, np.ones(n), "valid")[::hop]
    i = int(np.argmin(e)) * hop
    return np.tile(x[i : i + n], int(np.ceil(secs / win)))[: int(secs * SR)]


def dfn(x, lim):
    warm = room_tone(x)
    t = torch.from_numpy(np.r_[warm, x].astype(np.float32))[None]
    return enhance(model, df_state, t, atten_lim_db=lim)[0].numpy().astype(np.float64)[len(warm) :]


P0 = dehum(load(os.path.join(VM, "originals", "64859716-1487-4473-973d-e8aa78f483db.wav")))
P = {lim: dfn(P0, lim) for lim in (12.0, 20.0, None)}
for lim, y in P.items():
    save(os.path.join(VM, "work/patch", f"pick_dehum_dfn{int(lim) if lim else 'full'}.wav"), y)
save(os.path.join(VM, "work/patch", "pick_dehum.wav"), P0)
S = highpass(load(os.path.join(VM, "originals", FILES["01-samsung"])), 70, order=4)
D = highpass(load(os.path.join(VM, "originals", FILES["04-deadline"])), 70, order=4)

BANDS = [80, 100, 125, 160, 200, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600, 2000, 2500, 3150, 4000, 5000, 6300]


def bands(x, a, b, within=12.0):
    seg = x[int(a * SR) : int(b * SR)]
    n = int(0.02 * SR)
    fr = seg[: len(seg) // n * n].reshape(-1, n)
    db = 20 * np.log10(np.sqrt((fr**2).mean(1)) + 1e-12)
    sp = fr[db > db.max() - within].ravel()
    f, p = welch(sp, SR, nperseg=2048)
    out = []
    for fc in BANDS:
        m = (f >= fc / 2 ** (1 / 6)) & (f < fc * 2 ** (1 / 6))
        out.append(10 * np.log10(np.sum(p[m]) + 1e-20))
    return np.array(out), float(db.max())


pairs = [
    ("we", (1.75, 2.03), S, (23.93, 24.05)),
    ("AST", (8.76, 8.97), S, (2.06, 2.22)),
    ("hiring", (5.98, 6.38), D, (25.45, 25.77)),
]
print("band Hz      " + " ".join(f"{b:>5d}" for b in BANDS))
diffs = {lim: [] for lim in P}
for lim, Pd in P.items():
    for w, ps, host, hs in pairs:
        bp, pkp = bands(Pd, *ps)
        bh, pkh = bands(host, *hs)
        d = (bh - bh[BANDS.index(500)]) - (bp - bp[BANDS.index(500)])  # shape difference, 500 Hz anchored
        diffs[lim].append(d)
        print(f"{str(lim):>4s} {w:7s} " + " ".join(f"{v:+5.1f}" for v in d) + f"   peak pick {pkp:.1f} host {pkh:.1f}")
    m = np.mean(diffs[lim], axis=0)
    print(f"{str(lim):>4s} mean    " + " ".join(f"{v:+5.1f}" for v in m))
# noise floor of each denoised version
for lim, y in P.items():
    n = int(0.05 * SR)
    fr = y[: len(y) // n * n].reshape(-1, n)
    db = 20 * np.log10(np.sqrt((fr**2).mean(1)) + 1e-12)
    print(f"pick-up after dfn {lim}: floor p10 {np.percentile(db, 10):.1f} dBFS")
n = int(0.05 * SR)
for nm, y in (("samsung", S), ("deadline", D), ("pick dehum", P0)):
    fr = y[: len(y) // n * n].reshape(-1, n)
    db = 20 * np.log10(np.sqrt((fr**2).mean(1)) + 1e-12)
    print(f"{nm}: floor p10 {np.percentile(db, 10):.1f} dBFS")
