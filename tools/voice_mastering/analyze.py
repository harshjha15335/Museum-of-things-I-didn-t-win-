"""Measure a set of recordings: loudness, levels, noise floor, clipping, bandwidth, hum, pauses.

Usage: python analyze.py <out.csv> <file.wav> [<file.wav> ...]
Prints a readable summary and writes one CSV row per file.
"""
import csv
import sys

import numpy as np
import pyloudnorm as pyln
import soundfile as sf
from scipy.signal import resample_poly, welch


def frame_rms_db(x, sr, win=0.05, hop=0.025):
    n, h = int(sr * win), int(sr * hop)
    if len(x) < n:
        return np.array([-120.0])
    idx = np.arange(0, len(x) - n, h)
    fr = np.stack([x[i : i + n] for i in idx])
    rms = np.sqrt(np.mean(fr**2, axis=1) + 1e-12)
    return 20 * np.log10(rms + 1e-12)


def true_peak_db(x):
    up = resample_poly(x, 4, 1)
    return 20 * np.log10(np.max(np.abs(up)) + 1e-12)


def analyze(path):
    x, sr = sf.read(path, dtype="float64", always_2d=True)
    x = x.mean(axis=1)
    dur = len(x) / sr
    meter = pyln.Meter(sr)
    lufs = meter.integrated_loudness(x) if dur > 0.5 else float("nan")
    peak = 20 * np.log10(np.max(np.abs(x)) + 1e-12)
    tp = true_peak_db(x)
    rms = 20 * np.log10(np.sqrt(np.mean(x**2)) + 1e-12)
    clip = int(np.sum(np.abs(x) >= 0.999))
    dc = float(np.mean(x))
    fdb = frame_rms_db(x, sr)
    noise = float(np.percentile(fdb, 10))
    speech = float(np.percentile(fdb, 95))
    snr = speech - noise
    # pauses: runs of frames within 6 dB of the floor, >= 0.35 s
    quiet = fdb < noise + 8
    runs, cur = [], 0
    for q in quiet:
        if q:
            cur += 1
        else:
            if cur:
                runs.append(cur)
            cur = 0
    if cur:
        runs.append(cur)
    hop = 0.025
    pauses = [r * hop for r in runs if r * hop >= 0.35]
    # spectrum: where does energy stop, how much hum
    f, p = welch(x, sr, nperseg=4096)
    pdb = 10 * np.log10(p + 1e-20)
    total = np.sum(p)
    above7 = 10 * np.log10(np.sum(p[f > 7000]) / total + 1e-20)
    band = lambda lo, hi: 10 * np.log10(np.sum(p[(f >= lo) & (f < hi)]) / total + 1e-20)
    hum = {}
    for base in (50, 60):
        k = np.argmin(np.abs(f - base))
        neigh = np.r_[pdb[max(0, k - 8) : k - 2], pdb[k + 3 : k + 9]]
        hum[base] = float(pdb[k] - np.median(neigh))
    # noise-only spectrum (frames near the floor) to see what the noise is
    n, h = int(sr * 0.05), int(sr * 0.025)
    idx = np.arange(0, len(x) - n, h)
    qidx = [i for i, d in zip(idx, fdb) if d < noise + 3]
    if qidx:
        nz = np.concatenate([x[i : i + n] for i in qidx])
        fn, pn = welch(nz, sr, nperseg=1024)
        pn_db = 10 * np.log10(pn + 1e-20)
        lo = float(np.mean(pn_db[(fn > 50) & (fn < 300)]))
        mid = float(np.mean(pn_db[(fn > 300) & (fn < 3000)]))
        hi = float(np.mean(pn_db[(fn > 3000) & (fn < 7800)]))
        noise_shape = f"low {lo:.0f} / mid {mid:.0f} / high {hi:.0f} dB"
    else:
        noise_shape = "n/a"
    return {
        "file": path.split("/")[-1],
        "sr": sr,
        "dur_s": round(dur, 2),
        "lufs": round(lufs, 1),
        "rms_dbfs": round(rms, 1),
        "peak_dbfs": round(peak, 1),
        "true_peak_dbtp": round(tp, 1),
        "clipped_samples": clip,
        "dc": round(dc, 5),
        "noise_floor_dbfs": round(noise, 1),
        "speech_p95_dbfs": round(speech, 1),
        "snr_db": round(snr, 1),
        "pauses_n": len(pauses),
        "longest_pause_s": round(max(pauses) if pauses else 0, 2),
        "lead_silence_s": round(next((i * hop for i, q in enumerate(quiet) if not q), 0), 2),
        "energy_above_7k_db": round(above7, 1),
        "low_0_120_db": round(band(0, 120), 1),
        "mud_250_500_db": round(band(250, 500), 1),
        "presence_2k_5k_db": round(band(2000, 5000), 1),
        "hum50_db": round(hum[50], 1),
        "hum60_db": round(hum[60], 1),
        "noise_spectrum": noise_shape,
    }


if __name__ == "__main__":
    import os

    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from common import FILES, NOTES

    section = {v: k for k, v in FILES.items()}
    out = sys.argv[1]
    rows = []
    for p in sys.argv[2:]:
        base = os.path.basename(p)
        sec = section.get(base, "")
        rows.append({"section": sec, **analyze(p), "notes": NOTES.get(sec, "")})
    with open(out, "w", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)
    for r in rows:
        print(" | ".join(f"{k}={v}" for k, v in r.items()))
