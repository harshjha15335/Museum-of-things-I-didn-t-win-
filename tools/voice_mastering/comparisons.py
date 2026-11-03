"""Listening aids: level-matched before/after files and spectrograms.

Usage: python comparisons.py <vm dir>

comparisons/<name>_before_after.wav   the edited original, 0.8 s silence, the primary master (whole take)
comparisons/<name>_all_versions.wav   the same 10 s excerpt as: original, A clean, B enhanced, C master
                                      (DSP path), then B and C of the Resemble Enhance path, 0.8 s apart
Everything is level-matched to -23 LUFS, so a difference is tone and noise, not just loudness.
comparisons/<name>_spectrogram.png    original vs A vs C (both paths), 0-12 kHz
"""
import json
import os
import sys

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
from scipy.signal import spectrogram  # noqa: E402

sys.path.insert(0, os.path.dirname(__file__))
from common import FILES, SR, load, lufs, save, true_peak_db  # noqa: E402

vm = sys.argv[1]
P = lambda *a: os.path.join(vm, *a)  # noqa: E731
primary = json.load(open(P("reports", "selection.json")))["primary"]
gap = np.zeros(int(0.8 * SR))


def match(x, target=-23.0):
    return x * 10 ** ((target - lufs(x)) / 20)


def safe(y):
    tp = true_peak_db(y)
    return y * 10 ** ((-1.0 - tp) / 20) if tp > -1.0 else y


for n in FILES:
    v = {
        "Original (edited, high-passed)": P("work", "variants2", f"{n}_orig.wav"),
        "A clean": P("cleaned", f"{n}_A_clean.wav"),
        "B enhanced (DSP)": P("enhanced", f"{n}_B_enhanced_dsp.wav"),
        "C master (DSP)": P("mastered", "alternates", f"{n}_C_master_dsp.wav"),
        "B enhanced (Resemble)": P("enhanced", f"{n}_B_enhanced_resemble.wav"),
        "C master (Resemble)": P("mastered", "alternates", f"{n}_C_master_resemble.wav"),
    }
    sig = {k: load(p) for k, p in v.items() if os.path.exists(p)}
    orig = sig["Original (edited, high-passed)"]
    master = sig[f"C master ({'Resemble' if primary == 'resemble' else 'DSP'})"]
    save(P("comparisons", f"{n}_before_after.wav"), safe(np.r_[match(orig), gap, match(master)]))
    a, b = int(0.0 * SR), int(min(10.0, len(orig) / SR) * SR)
    parts = []
    for k, x in sig.items():
        parts += [match(x)[a:b], gap]
    save(P("comparisons", f"{n}_all_versions.wav"), safe(np.concatenate(parts)))

    keys = ["Original (edited, high-passed)", "A clean", "C master (DSP)", "C master (Resemble)"]
    keys = [k for k in keys if k in sig]
    fig, axes = plt.subplots(len(keys), 1, figsize=(12, 2.3 * len(keys)), sharex=True)
    for ax, k in zip(axes, keys):
        x = match(sig[k])[a:b]
        f, t, S = spectrogram(x, SR, nperseg=2048, noverlap=1536)
        ax.pcolormesh(t, f / 1000, 10 * np.log10(S + 1e-14), vmin=-130, vmax=-40, shading="auto", cmap="magma")
        ax.set_ylim(0, 12)
        ax.set_ylabel("kHz")
        ax.set_title(k, fontsize=10, loc="left")
    axes[-1].set_xlabel("seconds")
    fig.suptitle(f"{n}: first 10 s, all at -23 LUFS", fontsize=11)
    fig.tight_layout()
    fig.savefig(P("comparisons", f"{n}_spectrogram.png"), dpi=110)
    plt.close(fig)
    print(n, "ok", flush=True)
