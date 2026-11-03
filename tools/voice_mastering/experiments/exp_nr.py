"""Experiment: frequency-selective spectral gating (noisereduce, stationary) instead of DeepFilterNet in speech."""
import json, os, sys
import numpy as np
import noisereduce as nr
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from common import FILES, SR, load, save, highpass
vm = sys.argv[1]
V2 = os.path.join(vm, "work", "variants2")
out = os.path.join(vm, "work", "variants3"); os.makedirs(out, exist_ok=True)
import stage1_lib as s1
for name, src in FILES.items():
    x = highpass(load(os.path.join(vm, "originals", src)), 70, order=4)
    n = int(0.05 * SR)
    fr = x[: len(x) // n * n].reshape(-1, n)
    db = 20 * np.log10(np.sqrt((fr**2).mean(1)) + 1e-10)
    quiet = fr[db < np.percentile(db, 15)].ravel()
    for tag, pd in (("nr90", 0.9), ("nr80", 0.8)):
        y = nr.reduce_noise(y=x, sr=SR, y_noise=quiet, stationary=True, prop_decrease=pd, n_std_thresh_stationary=1.5,
                            n_fft=2048, win_length=1024, hop_length=256, freq_mask_smooth_hz=300, time_mask_smooth_ms=40)
        steps = json.load(open(os.path.join(vm, "work", f"{name}_edits.json")))["steps"]
        save(os.path.join(out, f"{name}_{tag}.wav"), s1.apply_plan(y, [tuple(s) for s in steps]))
    print(name, "ok", flush=True)
