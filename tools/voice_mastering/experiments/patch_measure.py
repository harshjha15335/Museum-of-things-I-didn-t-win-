"""Measure the 4 Nov single-word pick-ups against the takes they would patch: word spans, pitch, tone, noise.

Usage: python patch_measure.py <vm dir> <out json>
"""
import json
import os
import re
import sys

import numpy as np
import parselmouth
import torch
import torchaudio
from scipy.signal import resample_poly, welch

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from common import FILES, REFERENCE, SR, load  # noqa: E402

VM, OUT = sys.argv[1], sys.argv[2]
PICK = "64859716-1487-4473-973d-e8aa78f483db.wav"
X = {
    "pick": load(os.path.join(VM, "originals", PICK)),
    "samsung": load(os.path.join(VM, "originals", FILES["01-samsung"])),
    "deadline": load(os.path.join(VM, "originals", FILES["04-deadline"])),
}

bundle = torchaudio.pipelines.MMS_FA
model = bundle.get_model(with_star=False).eval()
tok, aligner = bundle.get_tokenizer(), bundle.get_aligner()
vocab = set(bundle.get_dict())
SPOKEN = {"1": "one", "2": "two", "3": "three", "4": "four", "5": "five"}


def words_of(text):
    ws = [
        "".join(c for c in part.lower() if c in vocab)
        for w in re.sub(r"[^A-Za-z0-9' -]+", " ", text).replace("-", " ").split()
        for part in SPOKEN.get(w, w).split()
    ]
    return [w for w in ws if w]


def align(x, t0, t1, text):
    y = resample_poly(x[int(t0 * SR) : int(t1 * SR)], 1, 3).astype(np.float32)
    ws = words_of(text)
    with torch.inference_mode():
        em, _ = model(torch.from_numpy(y)[None])
        spans = aligner(em[0], tok(ws))
    ratio = len(y) / em.size(1) / 16000
    return [
        {"w": w, "a": round(t0 + sp[0].start * ratio, 3), "b": round(t0 + sp[-1].end * ratio, 3),
         "p": round(float(np.mean([s.score for s in sp])), 2)}
        for w, sp in zip(ws, spans)
    ]


A = {
    "pick": align(X["pick"], 0, len(X["pick"]) / SR, "We didn't. ASTFLOW. ASTFLOW. Hiring challenge. ASTFLOW."),
    "samsung": align(X["samsung"], 0, len(X["samsung"]) / SR, REFERENCE["01-samsung"]),
    "deadline": align(X["deadline"], 8.02, len(X["deadline"]) / SR,
                      REFERENCE["04-deadline"].split("building. ", 1)[1]),
}


def pitch_track(x, a, b):
    seg = x[int(max(0, a - 0.05) * SR) : int((b + 0.05) * SR)]
    snd = parselmouth.Sound(seg, sampling_frequency=SR)
    p = snd.to_pitch_ac(time_step=0.01, pitch_floor=60, pitch_ceiling=320)
    f = p.selected_array["frequency"]
    t = p.xs() + max(0, a - 0.05)
    return [(round(float(tt), 3), round(float(ff), 1)) for tt, ff in zip(t, f) if ff > 0 and a <= tt <= b]


def st(f, ref=100.0):
    return 12 * np.log2(f / ref)


BANDS = [63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600, 2000, 2500, 3150, 4000, 5000, 6300]


def band_db(x, a, b):
    seg = x[int(a * SR) : int(b * SR)]
    f, pxx = welch(seg, SR, nperseg=min(4096, len(seg)))
    out = {}
    for fc in BANDS:
        lo, hi = fc / 2 ** (1 / 6), fc * 2 ** (1 / 6)
        m = (f >= lo) & (f < hi)
        out[fc] = float(10 * np.log10(np.sum(pxx[m]) * (f[1] - f[0]) + 1e-20))
    return out


def rms_db(x, a, b):
    seg = x[int(a * SR) : int(b * SR)]
    return float(20 * np.log10(np.sqrt(np.mean(seg**2)) + 1e-12))


def peak_frame_db(x, a, b, win=0.03):
    seg = x[int(a * SR) : int(b * SR)]
    n = int(win * SR)
    if len(seg) < n:
        return rms_db(x, a, b)
    fr = seg[: len(seg) // n * n].reshape(-1, n)
    return float(np.max(20 * np.log10(np.sqrt((fr**2).mean(1)) + 1e-12)))


def find(name, w, nth=0):
    hits = [s for s in A[name] if s["w"] == w]
    return hits[nth]


res = {"align": A, "words": {}}
pairs = {
    "we(pick)": ("pick", "we", 0), "didnt(pick)": ("pick", "didn't", 0),
    "astflow1(pick)": ("pick", "astflow", 0), "astflow2(pick)": ("pick", "astflow", 1),
    "astflow3(pick)": ("pick", "astflow", 2),
    "hiring(pick)": ("pick", "hiring", 0), "challenge(pick)": ("pick", "challenge", 0),
    "astflow(samsung)": ("samsung", "astflow", 0),
    "we(samsung,2nd 'we')": ("samsung", "we", 2), "didnt(samsung)": ("samsung", "didn't", 0),
    "hiring(deadline)": ("deadline", "hiring", 0), "challenge(deadline)": ("deadline", "challenge", 0),
    "timed(deadline)": ("deadline", "timed", 0),
}
for k, (name, w, nth) in pairs.items():
    try:
        s = find(name, w, nth)
    except IndexError:
        continue
    pt = pitch_track(X[name], s["a"], s["b"])
    f0 = np.array([f for _, f in pt]) if pt else np.array([np.nan])
    res["words"][k] = {
        "span": [s["a"], s["b"]], "p": s["p"], "rms_db": round(rms_db(X[name], s["a"], s["b"]), 1),
        "peak30ms_db": round(peak_frame_db(X[name], s["a"], s["b"]), 1),
        "f0_median": round(float(np.nanmedian(f0)), 1), "f0_start": round(float(f0[0]), 1) if pt else None,
        "f0_end": round(float(f0[-1]), 1) if pt else None, "f0_track": pt,
        "bands": {str(b): round(v, 1) for b, v in band_db(X[name], s["a"], s["b"]).items()},
    }

# noise: quietest stretches (no speech) in each file
for name, x in X.items():
    n = int(0.05 * SR)
    fr = x[: len(x) // n * n].reshape(-1, n)
    db = 20 * np.log10(np.sqrt((fr**2).mean(1)) + 1e-12)
    q = np.where(db < np.percentile(db, 15))[0]
    noise = np.concatenate([fr[i] for i in q])
    f, pxx = welch(noise, SR, nperseg=32768)
    lowm = (f > 20) & (f < 400)
    peaks = []
    lp = 10 * np.log10(pxx[lowm] + 1e-20)
    fl = f[lowm]
    med = np.median(lp)
    for i in range(2, len(lp) - 2):
        if lp[i] == max(lp[i - 2 : i + 3]) and lp[i] > med + 10:
            peaks.append((round(float(fl[i]), 1), round(float(lp[i] - med), 1)))
    res.setdefault("noise", {})[name] = {
        "floor_db_p10": round(float(np.percentile(db, 10)), 1),
        "hum_peaks_hz_db_over_median": peaks[:12],
        "bands": {str(b): round(v, 1) for b, v in band_db(noise, 0, len(noise) / SR).items()},
    }

json.dump(res, open(OUT, "w"), indent=1)
for k, v in res["words"].items():
    print(f"{k:24s} {v['span']} p{v['p']:.2f} rms {v['rms_db']:6.1f} pk {v['peak30ms_db']:6.1f} "
          f"f0 med {v['f0_median']:6.1f} start {v['f0_start']} end {v['f0_end']}")
for name, v in res["noise"].items():
    print(name, "floor", v["floor_db_p10"], "hum", v["hum_peaks_hz_db_over_median"])
print("pick words:", [(s["w"], s["a"], s["b"], s["p"]) for s in A["pick"]])
print("samsung 0-6s:", [(s["w"], s["a"], s["b"]) for s in A["samsung"] if s["a"] < 6])
print("samsung 20-28s:", [(s["w"], s["a"], s["b"]) for s in A["samsung"] if 20 < s["a"] < 28])
print("deadline 20+:", [(s["w"], s["a"], s["b"]) for s in A["deadline"] if s["a"] > 20])
