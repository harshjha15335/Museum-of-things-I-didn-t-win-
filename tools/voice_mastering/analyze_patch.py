"""Look at a re-recorded line before patching it in: what was said, where each word is, how loud it is.

Usage: python analyze_patch.py <clip> "<expected words of one take>" [<reference upload> <ref start s> <ref end s>]

Prints the recognised text with word times (faster-whisper small.en), then forced-alignment spans of the
expected words for one take and for two takes (MMS_FA; the better-scoring layout is the likely one), the
noise floor, and each word's level against the clip's loudest speech. With a reference, also the
reference stretch's speech level, so the patch can be level-matched to the take it goes into.
"""
import os
import re
import sys

import numpy as np
import torch
import torchaudio
from faster_whisper import WhisperModel
from scipy.signal import resample_poly

sys.path.insert(0, os.path.dirname(__file__))
from common import load  # noqa: E402

clip, expected = sys.argv[1], sys.argv[2]
x = load(clip)  # 48 kHz mono
x16 = resample_poly(x, 1, 3)


def frames(y, sr=16000, win=0.05):
    n = int(win * sr)
    return 20 * np.log10(np.sqrt((y[: len(y) // n * n].reshape(-1, n) ** 2).mean(1)) + 1e-9)


db = frames(x16)
floor, loud = np.percentile(db, 10), np.percentile(db, 95)
print(f"duration {len(x) / 48000:.2f} s | noise floor {floor:.1f} dBFS | loud speech {loud:.1f} dBFS | SNR {loud - floor:.1f} dB")
first = np.where(db > floor + 10)[0]
print(f"first sound 10 dB over the floor at {first[0] * 0.05:.2f} s" if len(first) else "no speech found")

m = WhisperModel("small.en", device="cpu", compute_type="int8", cpu_threads=4)
pad = np.zeros(int(0.6 * 16000))
segs, _ = m.transcribe(np.r_[pad, x16, pad].astype(np.float32), word_timestamps=True, language="en", beam_size=5)
for s in segs:
    print("ASR:", " ".join(f"{w.word.strip()}[{w.start - 0.6:.2f}-{w.end - 0.6:.2f}]" for w in s.words))

bundle = torchaudio.pipelines.MMS_FA
model = bundle.get_model(with_star=False).eval()
tok, aligner = bundle.get_tokenizer(), bundle.get_aligner()
vocab = set(bundle.get_dict())
SPOKEN = {"2026": "twenty twenty six", "1": "one", "2": "two", "3": "three", "4": "four", "5": "five"}
# Same normalising as force_align.py: punctuation dropped, hyphens split, numbers spelled out.
words = [
    "".join(c for c in part.lower() if c in vocab)
    for w in re.sub(r"[^A-Za-z0-9' -]+", " ", expected).replace("-", " ").split()
    for part in SPOKEN.get(w, w).split()
]
words = [w for w in words if w]
with torch.inference_mode():
    em, _ = model(torch.from_numpy(x16.astype(np.float32))[None])
ratio = len(x16) / em.size(1) / 16000
for takes in (1, 2):
    ws = words * takes
    try:
        with torch.inference_mode():
            spans = aligner(em[0], tok(ws))
    except Exception as e:  # noqa: BLE001
        print(f"{takes} take(s): alignment failed ({e})")
        continue
    out, scores = [], []
    for w, sp in zip(ws, spans):
        a, b = sp[0].start * ratio, sp[-1].end * ratio
        lvl = 20 * np.log10(np.sqrt(np.mean(x16[int(a * 16000) : max(int(b * 16000), int(a * 16000) + 1)] ** 2)) + 1e-9)
        sc = float(np.mean([t.score for t in sp]))
        scores.append(sc)
        out.append(f"{w}[{a:.2f}-{b:.2f} {lvl - loud:+.0f}dB p{sc:.2f}]")
    print(f"{takes} take(s), mean score {np.mean(scores):.2f}:", " ".join(out))

if len(sys.argv) > 5:
    r = resample_poly(load(sys.argv[3]), 1, 3)
    a, b = float(sys.argv[4]), float(sys.argv[5])
    rdb = frames(r[int(a * 16000) : int(b * 16000)])
    print(f"reference {os.path.basename(sys.argv[3])} {a}-{b} s: loud speech {np.percentile(rdb, 95):.1f} dBFS, "
          f"whole-take floor {np.percentile(frames(r), 10):.1f} dBFS -> gain to match {np.percentile(rdb, 95) - loud:+.1f} dB")
