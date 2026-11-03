"""Batch voice mastering, end to end, all local (no cloud services).

Usage:
  python scripts/batch_master.py <voice_mastering dir> [--resemble-run-dir DIR] [--ecapa-dir DIR] [--skip-resemble]

Input: originals/<upload>.wav (never modified). The section each upload belongs to, the retake cuts
and clip gains are listed in scripts/common.py (FILES, EDITS), found from the words themselves.

  1  analyze.py        recording_inventory.csv (levels, noise floor, clipping, bandwidth, hum, pauses)
  2  stage1_clean.py   Version A: 70 Hz high-pass, DeepFilterNet3 (capped in speech, guarded by spectral
                       gating where it would eat a word), retake cuts, trims -> cleaned/
  3  re_enhance.py     Resemble Enhance on each A file (optional, ~6-10x realtime on 4 CPU cores)
  4  stage2_master.py  Version B (EQ, or Resemble + EQ) and C (de-ess, expander, compressor, -16 LUFS,
                       -1.5 dBTP true-peak limit), -18 LUFS video mix, WAV 24-bit + MP3 320k
  5  qc_asr.py         local speech recognition of originals and masters (word error rate, fragile words)
  6  qc.py             speaker similarity, no-reference quality estimates, pitch, pause noise, LUFS/TP/LRA
  7  select_master.py  primary master (same path for every file)
  8  comparisons.py    level-matched before/after files and spectrograms
  9  report.py         loudness_report.csv and the data tables of quality_report.md

Needs: numpy<2, scipy, soundfile, pyloudnorm, noisereduce, deepfilternet, torch/torchaudio (CPU),
faster-whisper, speechbrain, librosa, matplotlib, ffmpeg with libmp3lame; for step 3 resemble-enhance
and its model (run dir). Python 3.11 was used.
"""
import argparse
import glob
import os
import subprocess
import sys

here = os.path.dirname(os.path.abspath(__file__))
ap = argparse.ArgumentParser()
ap.add_argument("vm")
ap.add_argument("--resemble-run-dir")
ap.add_argument("--ecapa-dir", required=True)
ap.add_argument("--skip-resemble", action="store_true")
a = ap.parse_args()
vm = os.path.abspath(a.vm)
py = sys.executable
sys.path.insert(0, here)
from common import FILES  # noqa: E402


def run(*args, env=None):
    print("+", " ".join(os.path.basename(x) if x.startswith(here) else x for x in args), flush=True)
    subprocess.run([py, *args], check=True, env=env)


for d in ("cleaned", "enhanced", "mastered/alternates", "video_mix_versions/alternates", "comparisons", "reports", "work"):
    os.makedirs(os.path.join(vm, d), exist_ok=True)
S = lambda name: os.path.join(here, name)  # noqa: E731
run(S("analyze.py"), os.path.join(vm, "reports", "recording_inventory.csv"), *[os.path.join(vm, "originals", f) for f in FILES.values()])
run(S("stage1_clean.py"), vm, "variants2")
if not a.skip_resemble:
    env = dict(os.environ)
    stubs = os.path.join(here, "stubs")
    env["PYTHONPATH"] = stubs + os.pathsep + env.get("PYTHONPATH", "")
    for n in FILES:
        run(S("re_enhance.py"), a.resemble_run_dir, "enhance", "32", "0.1", "0.5",
            os.path.join(vm, "work", "variants2", f"{n}_A.wav"), os.path.join(vm, "enhanced", f"{n}_re_raw.wav"), env=env)
run(S("stage2_master.py"), vm)
masters = sorted(glob.glob(os.path.join(vm, "mastered", "alternates", "*_C_master_*.wav")))
asr = os.path.join(vm, "work", "asr_final.json")
run(S("qc_asr.py"), "small.en", asr, *masters, *[os.path.join(vm, "work", "variants2", f"{n}_orig.wav") for n in FILES])
qc = os.path.join(vm, "work", "qc.json")
run(S("qc.py"), vm, a.ecapa_dir, qc)
run(S("select_master.py"), vm, qc, asr)
run(S("comparisons.py"), vm)
run(S("report.py"), vm, qc, asr)
print("done:", vm)
