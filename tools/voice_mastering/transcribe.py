"""Local speech recognition (faster-whisper) with word timestamps, used as a reference only.

Usage: python transcribe.py <model> <out.json> <file.wav> [...]
"""
import json
import sys

from faster_whisper import WhisperModel

model_name, out = sys.argv[1], sys.argv[2]
model = WhisperModel(model_name, device="cpu", compute_type="int8", cpu_threads=4)
res = {}
for path in sys.argv[3:]:
    segs, info = model.transcribe(
        path,
        language="en",
        beam_size=5,
        word_timestamps=True,
        vad_filter=False,
        condition_on_previous_text=False,
    )
    words, text = [], []
    for s in segs:
        text.append(s.text.strip())
        for w in s.words or []:
            words.append({"w": w.word.strip(), "s": round(w.start, 2), "e": round(w.end, 2), "p": round(w.probability, 2)})
    name = path.split("/")[-1]
    res[name] = {"text": " ".join(text), "words": words}
    print(f"== {name}\n{' '.join(text)}\n", flush=True)
with open(out, "w") as fh:
    json.dump(res, fh, indent=1)
