"""Experiment: DeepFilterNet-based hybrids vs the spectral-gating hybrid (artefacts vs word survival)."""
import json, os, sys
import numpy as np
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.argv = [sys.argv[0], sys.argv[1], "variants4"]
import importlib.util
spec = importlib.util.spec_from_file_location("s1", os.path.join(os.path.dirname(__file__), "..", "stage1_clean.py"))
src = open(spec.origin).read()
src = src[: src.index("for name, src in FILES.items():")]  # helpers + models only
g = {"__name__": "s1", "__file__": spec.origin}
exec(compile(src, spec.origin, "exec"), g)
from common import EDITS, FILES, SR, highpass, load, save
vm = sys.argv[1]; out = os.path.join(vm, "work", "variants4"); os.makedirs(out, exist_ok=True)
for name, src_ in FILES.items():
    x = highpass(load(os.path.join(vm, "originals", src_)), 70, order=4)
    warm = g["room_tone"](x)
    full, l24, l18 = g["dfn"](x, None, warm), g["dfn"](x, 24.0, warm), g["dfn"](x, 18.0, warm)
    g80 = g["spectral_gate"](x, 0.8)
    m = g["speech_mask"](x, full)
    var = {"dl24h": m * l24 + (1 - m) * full, "dl18h": m * l18 + (1 - m) * full, "mixh": m * (0.5 * g80 + 0.5 * l24) + (1 - m) * full}
    for a, b, prop in EDITS[name].get("protect", []):
        w = np.zeros(len(x)); w[int(a * SR) : int(b * SR)] = 1.0
        k = int(0.03 * SR); w = np.convolve(w, np.ones(k) / k, "same")
        soft = g["spectral_gate"](x, prop)
        var = {k2: w * soft + (1 - w) * v for k2, v in var.items()}
    steps = [tuple(s) for s in json.load(open(os.path.join(vm, "work", f"{name}_edits.json")))["steps"]]
    for k2, v in var.items():
        save(os.path.join(out, f"{name}_{k2}.wav"), g["apply_plan"](g["clip_gain"](v, EDITS[name].get("gain", [])), steps))
    print(name, "ok", flush=True)
