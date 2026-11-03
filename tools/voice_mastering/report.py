"""Reports: loudness_report.csv and the measured tables for quality_report.md.

Usage: python report.py <vm dir> <qc.json> <asr.json>
Writes reports/loudness_report.csv and reports/quality_tables.md.
"""
import csv
import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from common import FILES, load, lufs, true_peak_db  # noqa: E402
from dsp import decode, ffmpeg_loudness, lra  # noqa: E402

vm, qc_path, asr_path = sys.argv[1:4]
P = lambda *a: os.path.join(vm, *a)  # noqa: E731
qc, asr = json.load(open(qc_path)), json.load(open(asr_path))
sel = json.load(open(P("reports", "selection.json")))
prim = sel["primary"]

rows = []
for n, src in FILES.items():
    files = {
        "original (upload, 16 kHz)": P("originals", src),
        "A clean (peak -1.5 dBTP)": P("cleaned", f"{n}_A_clean.wav"),
        "B enhanced DSP (peak -1.5 dBTP)": P("enhanced", f"{n}_B_enhanced_dsp.wav"),
        "B enhanced Resemble (peak -1.5 dBTP)": P("enhanced", f"{n}_B_enhanced_resemble.wav"),
        "C master DSP": P("mastered", "alternates", f"{n}_C_master_dsp.wav"),
        "C master Resemble": P("mastered", "alternates", f"{n}_C_master_resemble.wav"),
        f"C master PRIMARY ({prim}) WAV": P("mastered", f"{n}_C_master.wav"),
        f"C master PRIMARY ({prim}) MP3 320k": P("mastered", f"{n}_C_master.mp3"),
        f"video mix -18 LUFS ({prim}) WAV": P("video_mix_versions", f"{n}_C_master_-18LUFS.wav"),
        f"video mix -18 LUFS ({prim}) MP3 320k": P("video_mix_versions", f"{n}_C_master_-18LUFS.mp3"),
    }
    for label, path in files.items():
        if not os.path.exists(path):
            continue
        x = decode(path) if path.endswith(".mp3") else load(path)
        fi, fl, ft = ffmpeg_loudness(path)
        rows.append({
            "section": n, "version": label, "file": os.path.relpath(path, vm),
            "integrated_lufs": round(lufs(x), 2), "true_peak_dbtp": round(true_peak_db(x), 2), "lra_lu": round(lra(x), 1),
            "ffmpeg_ebur128_lufs": fi, "ffmpeg_true_peak_dbtp": ft, "ffmpeg_lra_lu": fl,
            "duration_s": round(len(x) / 48000, 2),
        })
with open(P("reports", "loudness_report.csv"), "w", newline="") as fh:
    w = csv.DictWriter(fh, fieldnames=list(rows[0].keys()))
    w.writeheader()
    w.writerows(rows)

L = []
L.append(f"Primary master path: **{prim}** (same for every file).\n")
L.append("| Section | LUFS before | LUFS after | True peak after | Pauses before | Pauses after | Speaker similarity | Pitch before / after | Word errors before / after |")
L.append("|---|---|---|---|---|---|---|---|---|")
for n in FILES:
    q = qc[n]
    o, c = q["original"], q[f"C_{prim}"]
    lo = next(r for r in rows if r["section"] == n and r["version"].startswith("original"))
    ao, ac = asr.get(f"{n}_orig"), asr.get(f"{n}_C_master_{prim}")
    L.append(f"| {n} | {lo['integrated_lufs']} | {c['lufs']} | {c['true_peak']} dBTP | {o['gap_db']} dB | {c['gap_db']} dB | "
             f"{c['ecapa']} | {o['f0_median']} / {c['f0_median']} Hz | {ao['wer']*100:.1f}% / {ac['wer']*100:.1f}% |")
L.append("\nPauses = median level of the gaps between phrases relative to the loudest speech (lower is cleaner).")
L.append("Speaker similarity = ECAPA cosine similarity of the master to the original (1.0 = identical voice print).")
L.append("Word errors = local speech recognition (faster-whisper small.en) against what was said; the recogniser's own")
L.append("run-to-run noise on these files is a few points, so only large changes mean anything.\n")
L.append("| Section | Version | Speaker sim. | Est. STOI | Est. PESQ | Est. SI-SDR | Pitch | Pauses | LRA |")
L.append("|---|---|---|---|---|---|---|---|---|")
for n in FILES:
    for k, r in qc[n].items():
        L.append(f"| {n} | {k} | {r['ecapa']} | {r['squim_stoi']} | {r['squim_pesq']} | {r['squim_sisdr']} | {r['f0_median']} | {r['gap_db']} | {r['lra']} |")
L.append("\nEst. = torchaudio SQUIM no-reference estimates (a model's guess, not a listening test).\n")
L.append("| Section | Fragile words heard in the original | ... in the primary master |")
L.append("|---|---|---|")
for n in FILES:
    ao, ac = asr.get(f"{n}_orig"), asr.get(f"{n}_C_master_{prim}")
    fmt = lambda a: ", ".join(f"{w} {'yes' if v else 'NO'}" for w, v in a["watch"].items())  # noqa: E731
    L.append(f"| {n} | {fmt(ao)} | {fmt(ac)} |")
open(P("reports", "quality_tables.md"), "w").write("\n".join(L) + "\n")
print("\n".join(L[:12]))
