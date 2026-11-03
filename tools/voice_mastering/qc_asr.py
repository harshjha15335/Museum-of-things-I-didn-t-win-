"""Speech-recognition check: does every word survive processing? (local faster-whisper, CPU)

Usage: python qc_asr.py <model> <out.json> <file.wav> [...]
File names must start with the section name (e.g. 01-samsung_A_clean.wav). Each file is cut at pauses
into chunks of at most 12 s (Whisper misbehaves near its 30 s window edge: it once stopped at "And"),
each chunk padded with 0.6 s of silence (it tends to drop a first word that starts immediately), then
transcribed with word timings and scored against REFERENCE (word error rate) and WATCH (fragile words).
Timings in the output are in the file's own time.
"""
import json
import os
import sys
import tempfile

import numpy as np
from faster_whisper import WhisperModel

sys.path.insert(0, os.path.dirname(__file__))
from common import REFERENCE, SR, WATCH, has_phrase, load, save, speech_segments, wer  # noqa: E402

model_name, out = sys.argv[1], sys.argv[2]
model = WhisperModel(model_name, device="cpu", compute_type="int8", cpu_threads=4)
res = json.load(open(out)) if os.path.exists(out) else {}
tmp = tempfile.mkdtemp()


def chunks(x, max_len=12.0):
    segs = speech_segments(x)
    out, cur, last_e = [], 0.0, segs[0][1]
    for s, e in segs[1:]:
        if e - cur > max_len and s - last_e >= 0.15:
            cut = (last_e + s) / 2
            out.append((cur, cut))
            cur = cut
        last_e = e
    out.append((cur, len(x) / SR))
    return out

for path in sys.argv[3:]:
    base = os.path.basename(path)
    name = base[:-4]
    section = next(k for k in REFERENCE if base.startswith(k))
    x = load(path)
    words, text = [], []
    p2 = os.path.join(tmp, "chunk.wav")
    for c0, c1 in chunks(x):
        save(p2, np.r_[np.zeros(int(0.6 * SR)), x[int(c0 * SR) : int(c1 * SR)], np.zeros(int(0.6 * SR))])
        segs, _ = model.transcribe(p2, language="en", beam_size=5, word_timestamps=True, vad_filter=False,
                                   condition_on_previous_text=False)
        for s in segs:
            text.append(s.text.strip())
            for w in s.words or []:
                words.append({"w": w.word.strip(), "s": round(w.start - 0.6 + c0, 2), "e": round(w.end - 0.6 + c0, 2),
                              "p": round(w.probability, 3)})
    hyp = " ".join(text)
    r = {
        "section": section,
        "text": hyp,
        "wer": round(wer(REFERENCE[section], hyp), 4),
        "mean_word_prob": round(float(np.mean([w["p"] for w in words])) if words else 0.0, 4),
        "watch": {ph: has_phrase(hyp, ph) for ph in WATCH[section]},
        "words": words,
    }
    res[name] = r
    miss = [k for k, v in r["watch"].items() if not v]
    print(f"{name}: WER {r['wer']:.3f}  p {r['mean_word_prob']:.3f}  missing {miss}", flush=True)
    json.dump(res, open(out, "w"), indent=1)
