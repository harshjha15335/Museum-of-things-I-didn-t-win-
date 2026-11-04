"""Close-up spectrogram with formants (F1-F3), pitch and level, for checking what a short stretch really contains.

Usage: python zoom_plot.py <out png> <wav>:<a>:<b>:<title> [...]
"""
import sys

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
import parselmouth  # noqa: E402

sys.path.insert(0, __file__.rsplit("/", 2)[0])
from common import SR, highpass, load  # noqa: E402

out, specs = sys.argv[1], sys.argv[2:]
fig, axes = plt.subplots(len(specs), 1, figsize=(14, 3.4 * len(specs)))
axes = np.atleast_1d(axes)
cache = {}
for ax, spec in zip(axes, specs):
    path, a, b, title = spec.split(":", 3)
    a, b = float(a), float(b)
    if path not in cache:
        cache[path] = highpass(load(path), 70)
    seg = cache[path][int(a * SR) : int(b * SR)]
    snd = parselmouth.Sound(seg, sampling_frequency=SR)
    sp = snd.to_spectrogram(window_length=0.012, maximum_frequency=8000, time_step=0.002)
    db = 10 * np.log10(np.maximum(sp.values, 1e-14))
    ax.pcolormesh(sp.x_grid() + a, sp.y_grid(), db, vmin=db.max() - 65, vmax=db.max(), cmap="magma", shading="flat")
    fm = snd.to_formant_burg(time_step=0.005, max_number_of_formants=5, maximum_formant=5000)
    ts = np.arange(0.01, b - a - 0.01, 0.005)
    for k, c in ((1, "lime"), (2, "cyan"), (3, "white")):
        v = np.array([fm.get_value_at_time(k, t) for t in ts])
        ax.plot(ts + a, v, ".", color=c, ms=2.5)
    pitch = snd.to_pitch_ac(time_step=0.005, pitch_floor=60, pitch_ceiling=300, very_accurate=True)
    f = pitch.selected_array["frequency"]
    ax.plot(pitch.xs()[f > 0] + a, f[f > 0] * 10, "o", color="orange", ms=2.5, label="F0 x10")
    n = int(0.005 * SR)
    fr = seg[: len(seg) // n * n].reshape(-1, n)
    lv = 20 * np.log10(np.sqrt((fr**2).mean(1)) + 1e-9)
    ax3 = ax.twinx()
    ax3.plot(a + (np.arange(len(lv)) + 0.5) * 0.005, lv, "w-", lw=1)
    ax3.set_ylim(-80, 0)
    ax.set_ylim(0, 8000)
    ax.set_xlim(a, b)
    ax.set_xticks(np.arange(np.ceil(a * 20) / 20, b, 0.05))
    ax.grid(True, axis="x", alpha=0.3)
    ax.set_title(title + "  (lime F1, cyan F2, white F3, orange F0x10; white line = level dBFS, right axis)", fontsize=9, loc="left")
plt.tight_layout()
plt.savefig(out, dpi=70)
