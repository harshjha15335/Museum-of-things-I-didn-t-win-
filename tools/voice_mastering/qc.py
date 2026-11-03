"""Objective checks for every version (none of these is a listening test).

Usage: python qc.py <vm dir> <ecapa model dir> <out.json>

For each section and version (original edit, A, B, C for each enhancement path):
  ecapa      speaker-embedding cosine similarity to the original (ECAPA-TDNN, VoxCeleb; same voice
             recorded twice typically scores 0.7-0.9, different people under 0.4)
  squim      no-reference estimates of STOI / PESQ / SI-SDR (torchaudio SQUIM, DNS-2020), 16 kHz band
  f0_median  median pitch of voiced frames (YIN), to confirm the voice was not shifted
  gap_db     level of the pauses relative to the loudest speech (p95 of 50 ms frames), dB
  lufs / true_peak / lra
"""
import json
import os
import sys

import librosa
import numpy as np
import torch
import torch.nn.functional as F
from scipy.signal import resample_poly

sys.path.insert(0, os.path.dirname(__file__))
from common import FILES, SR, frame_db, load, lufs, speech_segments, true_peak_db  # noqa: E402
from dsp import lra  # noqa: E402

vm, ecapa_dir, out = sys.argv[1:4]
P = lambda *a: os.path.join(vm, *a)  # noqa: E731
torch.set_num_threads(4)

from speechbrain.inference.speaker import EncoderClassifier  # noqa: E402
from torchaudio.pipelines import SQUIM_OBJECTIVE  # noqa: E402

# local copy of speechbrain/spkrec-ecapa-voxceleb; its hyperparams point at the hub, so redirect them
enc = EncoderClassifier.from_hparams(source=ecapa_dir, savedir=os.path.join(vm, "work", "ecapa_run"), run_opts={"device": "cpu"},
                                     overrides={"pretrained_path": ecapa_dir})
squim = SQUIM_OBJECTIVE.get_model().eval()


def to16k(x):
    return resample_poly(x, 1, 3)


def embed(x16):
    with torch.no_grad():
        return enc.encode_batch(torch.from_numpy(x16.astype(np.float32))[None]).squeeze()


def squim_scores(x16):
    y = x16 * 10 ** ((-23 - lufs(x16, 16000)) / 20)
    with torch.no_grad():
        stoi, pesq, sisdr = squim(torch.from_numpy(y.astype(np.float32))[None])
    return round(float(stoi), 3), round(float(pesq), 2), round(float(sisdr), 1)


def f0_median(x16):
    f0 = librosa.yin(x16, fmin=60, fmax=320, sr=16000, frame_length=1024, hop_length=160)
    rms = librosa.feature.rms(y=x16, frame_length=1024, hop_length=160)[0]
    n = min(len(f0), len(rms))
    db = 20 * np.log10(rms[:n] + 1e-9)
    v = f0[:n][db > np.percentile(db, 10) + 20]
    return round(float(np.median(v)), 1)


def gap_db(x, segs):
    """Median level of the pauses (>= 0.15 s, 60 ms inset) vs the loudest speech, in dB."""
    n = int(0.05 * SR)
    fr = x[: len(x) // n * n].reshape(-1, n)
    db = 20 * np.log10(np.sqrt((fr**2).mean(1)) + 1e-10)
    loud = np.percentile(db, 95)
    gaps = []
    for (s0, e0), (s1, e1) in zip(segs, segs[1:]):
        a, b = e0 + 0.06, s1 - 0.06
        if b - a >= 0.15:
            g = x[int(a * SR) : int(b * SR)]
            gaps.append(20 * np.log10(np.sqrt((g**2).mean()) + 1e-10))
    return round(float(np.median(gaps) - loud), 1) if gaps else None


res = {}
for name in FILES:
    versions = {"original": P("work", "variants2", f"{name}_orig.wav"), "A_clean": P("cleaned", f"{name}_A_clean.wav")}
    for tag in ("dsp", "resemble"):
        b = P("enhanced", f"{name}_B_enhanced_{tag}.wav")
        if os.path.exists(b):
            versions[f"B_{tag}"] = b
            versions[f"C_{tag}"] = P("mastered", "alternates", f"{name}_C_master_{tag}.wav")
    sigs = {k: load(v) for k, v in versions.items()}
    segs = speech_segments(sigs["A_clean"])
    ref = embed(to16k(sigs["original"]))
    res[name] = {}
    for k, x in sigs.items():
        x16 = to16k(x)
        stoi, pesq, sisdr = squim_scores(x16)
        r = {
            "ecapa": round(float(F.cosine_similarity(ref, embed(x16), dim=0)), 3),
            "squim_stoi": stoi, "squim_pesq": pesq, "squim_sisdr": sisdr,
            "f0_median": f0_median(x16),
            "gap_db": gap_db(x, segs),
            "lufs": round(lufs(x), 2), "true_peak": round(true_peak_db(x), 2), "lra": round(lra(x), 1),
            "dur": round(len(x) / SR, 2),
        }
        res[name][k] = r
        print(name, k, r, flush=True)
    json.dump(res, open(out, "w"), indent=1)
