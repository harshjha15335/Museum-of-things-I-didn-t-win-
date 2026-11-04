"""Transcribe only the first N seconds of each file (1 s silence padding), to check word onsets."""
import os, sys, tempfile
import numpy as np
from faster_whisper import WhisperModel
sys.path.insert(0, os.path.dirname(__file__))
from common import SR, load, save
secs = float(sys.argv[1])
model = WhisperModel("small.en", device="cpu", compute_type="int8", cpu_threads=4)
tmp = os.path.join(tempfile.mkdtemp(), "h.wav")
for p in sys.argv[2:]:
    x = load(p)[: int(secs * SR)]
    save(tmp, np.r_[np.zeros(SR), x, np.zeros(SR)])
    segs, _ = model.transcribe(tmp, language="en", beam_size=5, vad_filter=False, condition_on_previous_text=False)
    print(f"{os.path.basename(p):30s} | {' '.join(s.text.strip() for s in segs)}", flush=True)
