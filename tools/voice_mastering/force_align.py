"""Caption timing by forced alignment (torchaudio MMS_FA, local CPU): the known caption words are
aligned to the master's audio, which is far steadier than speech-recognition word times (those moved
by up to a second between two runs on the same file).

Usage: python force_align.py <dir with <name>_C_master_dsp.wav> <out.json>
Each caption starts 0.05 s before its first word and ends 0.12 s after its last (never overlapping).
"""
import json
import os
import re
import sys

import numpy as np
import torch
import torchaudio
from scipy.signal import resample_poly

sys.path.insert(0, os.path.dirname(__file__))
from align_cues import LINES  # noqa: E402
from common import load  # noqa: E402

SPOKEN = {"2026": "twenty twenty six", "1": "one", "2": "two", "3": "three", "4": "four", "5": "five"}
bundle = torchaudio.pipelines.MMS_FA
model = bundle.get_model(with_star=False).eval()
tokenizer, aligner = bundle.get_tokenizer(), bundle.get_aligner()
vocab = set(bundle.get_dict())


def words_of(line):
    out = []
    for w in re.sub(r"[^A-Za-z0-9' -]+", " ", line).replace("-", " ").split():
        for part in SPOKEN.get(w, w).split():
            p = "".join(c for c in part.lower() if c in vocab)
            if p:
                out.append(p)
    return out


src, outp = sys.argv[1:3]
res = {}
for sec, lines in LINES.items():
    x = resample_poly(load(os.path.join(src, f"{sec}_C_master_dsp.wav")), 1, 3).astype(np.float32)
    dur = len(x) / 16000
    owner, words = [], []
    for i, line in enumerate(lines):
        for w in words_of(line):
            words.append(w)
            owner.append(i)
    with torch.inference_mode():
        emission, _ = model(torch.from_numpy(x)[None])
        spans = aligner(emission[0], tokenizer(words))
    ratio = len(x) / emission.size(1) / 16000
    wt = [(s[0].start * ratio, s[-1].end * ratio) for s in spans]
    cues = []
    for i, line in enumerate(lines):
        idx = [k for k, o in enumerate(owner) if o == i]
        cues.append({"text": line, "start": round(max(0.0, wt[idx[0]][0] - 0.05), 2), "end": round(min(dur, wt[idx[-1]][1] + 0.12), 2)})
    for a, b in zip(cues, cues[1:]):
        if a["end"] > b["start"]:
            a["end"] = round(max(a["start"] + 0.3, b["start"] - 0.02), 2)
    res[sec] = cues
    for c in cues:
        print(f"{sec} {c['start']:6.2f}-{c['end']:6.2f} {c['text']}", flush=True)
json.dump(res, open(outp, "w"), indent=1)
