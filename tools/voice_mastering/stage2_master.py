"""Stage 2: Version B (enhanced) and Version C (master) from Version A (clean), with exports.

Usage: python stage2_master.py <vm dir> [--no-a]

Reads work/variants2/<name>_A.wav (stage1's Version A, before peak normalising) and, when all seven exist,
enhanced/<name>_re_raw.wav (Resemble Enhance output from re_enhance.py, run on that A file). Two enhancement paths per file:
  dsp       B = one corrective/presence EQ for the whole set (match_eq_curve)
  resemble  B = Resemble Enhance (restoration + bandwidth extension) + a gentler EQ
and for each path:
  C = B -> de-esser -> gap expander -> compressor (2:1 above -25 dBFS at -23 LUFS) -> -16 LUFS -> true-peak limiter (-1.8 dBTP, verified at or below -1.5)
  V = C at -18 LUFS (video-mix version: sits under music without being turned down later)
A and B are exported peak-normalised to -1.5 dBTP (natural dynamics, just louder to audition).
WAV 48 kHz 24-bit mono + MP3 320 kbps for every version. select_master.py then picks the primary C.
"""
import json
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
from common import FILES, SR, load, lufs, save, true_peak_db  # noqa: E402
from dsp import apply_eq, compressor, deess, expander, finish, frames_db, match_eq_curve, mp3, peak_normalise  # noqa: E402

vm = sys.argv[1]
P = lambda *a: os.path.join(vm, *a)  # noqa: E731
names = list(FILES)


def write(path, x, title):
    save(path, x)
    mp3(path, path[:-4] + ".mp3", "320k", title)


def align_to(y, ref):
    """Undo any delay the enhancer added (cross-correlation over the first 10 s), match length."""
    n = min(len(ref), len(y), 10 * SR)
    m = 4800
    c = np.correlate(y[:n], ref[m : n - m], "valid")
    lag = int(np.argmax(c)) - m
    y = y[lag:] if lag > 0 else np.r_[np.zeros(-lag), y]
    y = y[: len(ref)]
    return np.r_[y, np.zeros(len(ref) - len(y))], lag


def master_chain(b):
    """B -> C. Works at -23 LUFS so the thresholds mean the same thing in every file."""
    x = b * 10 ** ((-23 - lufs(b)) / 20)
    x, ds_red = deess(x)
    _, db10 = frames_db(x, 0.01)
    floor = float(np.percentile(db10, 10))
    thr = min(floor + 8, -48.0)
    x = expander(x, thr)
    x, comp_gr = compressor(x, thr_db=-25.0, ratio=2.0, knee=8.0, attack=0.008, release=0.15)
    c = finish(x, -16.0, -1.5)
    v = finish(c, -18.0, -1.5)
    return c, v, {"deess_p99_db": round(ds_red, 2), "expander_thr_dbfs": round(thr, 1), "comp_gr_p95_db": round(comp_gr, 2)}


A = {n: load(P("work", "variants2", f"{n}_A.wav")) for n in names}  # Version A source (stage1)
curve_dsp, measured = match_eq_curve(list(A.values()))
RE, re_lag = {}, {}
for n in names:
    p = P("enhanced", f"{n}_re_raw.wav")
    if os.path.exists(p):
        RE[n], re_lag[n] = align_to(load(p), A[n])
curve_re = match_eq_curve(list(RE.values()), amount=0.5, clamp=3.0)[0] if len(RE) == len(names) else None
json.dump({"measured_speech_spectrum_rel_500Hz": measured, "dsp_eq_db": curve_dsp, "resemble_eq_db": curve_re,
           "resemble_lag_samples": re_lag}, open(P("reports", "eq_curves.json"), "w"), indent=1)
print("EQ (dsp):", curve_dsp, flush=True)
print("EQ (resemble):", curve_re, flush=True)

log = {}
for n in names:
    if "--no-a" not in sys.argv:
        write(P("cleaned", f"{n}_A_clean.wav"), peak_normalise(A[n]), f"{n} (A clean)")
    paths = {"dsp": apply_eq(A[n], curve_dsp)}
    if curve_re is not None:
        paths["resemble"] = apply_eq(RE[n], curve_re)
    for tag, b in paths.items():
        write(P("enhanced", f"{n}_B_enhanced_{tag}.wav"), peak_normalise(b), f"{n} (B enhanced, {tag})")
        c, v, st = master_chain(b)
        write(P("mastered", "alternates", f"{n}_C_master_{tag}.wav"), c, f"{n} (C master, {tag})")
        write(P("video_mix_versions", "alternates", f"{n}_C_video_-18LUFS_{tag}.wav"), v, f"{n} (-18 LUFS, {tag})")
        st.update({"C_lufs": round(lufs(c), 2), "C_true_peak": round(true_peak_db(c), 2),
                   "V_lufs": round(lufs(v), 2), "V_true_peak": round(true_peak_db(v), 2)})
        log[f"{n}:{tag}"] = st
        print(n, tag, st, flush=True)
json.dump(log, open(P("work", "stage2_log.json"), "w"), indent=1)
