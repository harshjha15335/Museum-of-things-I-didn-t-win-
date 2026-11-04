"""Spectrogram + pitch + level views of the splice sites and the pick-up candidates (for choosing edit points).

Usage: python patch_plot.py <vm dir> <out png>
"""
import os
import sys

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
import parselmouth  # noqa: E402
from scipy.signal import filtfilt, iirnotch  # noqa: E402

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from common import FILES, SR, highpass, load  # noqa: E402

VM, OUT = sys.argv[1], sys.argv[2]
b, a = iirnotch(100.3, 30.0, SR)
P = highpass(filtfilt(b, a, load(os.path.join(VM, "originals", "64859716-1487-4473-973d-e8aa78f483db.wav"))), 70)
S = highpass(load(os.path.join(VM, "originals", FILES["01-samsung"])), 70)
D = highpass(load(os.path.join(VM, "originals", FILES["04-deadline"])), 70)

views = [
    ("Samsung: 'Case file one. ASTFLOW. Three'", S, 0.4, 3.4),
    ("Pick-up: ASTFLOW take 1", P, 3.5, 5.0),
    ("Pick-up: ASTFLOW take 2", P, 8.4, 9.9),
    ("Samsung: 'qualify. We didn't. No reason'", S, 22.9, 25.5),
    ("Pick-up: 'We didn't.'", P, 1.3, 3.0),
    ("Deadline: 'in a timed hiring challenge.'", D, 24.7, 26.7),
    ("Pick-up: 'hiring challenge'", P, 5.6, 7.4),
]
fig, axes = plt.subplots(len(views), 1, figsize=(16, 3.0 * len(views)))
for ax, (title, x, t0, t1) in zip(axes, views):
    seg = x[int(t0 * SR) : int(t1 * SR)]
    snd = parselmouth.Sound(seg, sampling_frequency=SR)
    spec = snd.to_spectrogram(window_length=0.02, maximum_frequency=5000)
    db = 10 * np.log10(np.maximum(spec.values, 1e-14))
    X, Y = spec.x_grid() + t0, spec.y_grid()
    ax.pcolormesh(X, Y, db, vmin=db.max() - 70, vmax=db.max(), cmap="magma", shading="flat")
    ax.set_ylim(0, 5000)
    ax.set_xlim(t0, t1)
    ax.set_title(title, fontsize=10, loc="left")
    pitch = snd.to_pitch_ac(time_step=0.01, pitch_floor=60, pitch_ceiling=300, very_accurate=True)
    f = pitch.selected_array["frequency"]
    tt = pitch.xs() + t0
    ax2 = ax.twinx()
    ax2.plot(tt[f > 0], f[f > 0], "c.", ms=4)
    ax2.set_ylim(50, 250)
    ax2.set_ylabel("F0 Hz", color="c")
    n = int(0.01 * SR)
    fr = seg[: len(seg) // n * n].reshape(-1, n)
    lv = 20 * np.log10(np.sqrt((fr**2).mean(1)) + 1e-9)
    ax3 = ax.twinx()
    ax3.spines["right"].set_position(("outward", 45))
    ax3.plot(t0 + (np.arange(len(lv)) + 0.5) * 0.01, lv, "w-", lw=1)
    ax3.set_ylim(-75, -5)
    ax3.set_ylabel("dBFS", color="w")
    ax.set_xticks(np.arange(np.ceil(t0 * 10) / 10, t1, 0.1), minor=True)
    ax.grid(True, which="both", axis="x", alpha=0.25)
plt.tight_layout()
plt.savefig(OUT, dpi=70)
