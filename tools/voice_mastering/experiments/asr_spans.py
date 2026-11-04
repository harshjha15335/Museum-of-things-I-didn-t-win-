"""Recognise short spans of a file on their own (faster-whisper small.en, 0.6 s of silence around each).

Usage: python asr_spans.py <wav> a-b [a-b ...]
"""
import sys

import numpy as np
from faster_whisper import WhisperModel
from scipy.signal import resample_poly

sys.path.insert(0, __file__.rsplit("/", 2)[0])
from common import SR, load  # noqa: E402

x = load(sys.argv[1])
m = WhisperModel("small.en", device="cpu", compute_type="int8", cpu_threads=4)
for span in sys.argv[2:]:
    a, b = (float(v) for v in span.split("-"))
    y = resample_poly(x[int(a * SR) : int(b * SR)], 1, 3)
    pad = np.zeros(int(0.6 * 16000))
    segs, _ = m.transcribe(np.r_[pad, y, pad].astype(np.float32), word_timestamps=True, language="en", beam_size=5)
    words = [(w.word.strip(), round(w.start - 0.6 + a, 2), round(w.end - 0.6 + a, 2), round(w.probability, 2)) for s in segs for w in s.words]
    lv = 20 * np.log10(np.sqrt(np.mean(x[int(a * SR) : int(b * SR)] ** 2)) + 1e-12)
    print(f"{span:>11s} rms {lv:6.1f} dBFS: {words}")
