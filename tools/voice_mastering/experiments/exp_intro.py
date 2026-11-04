import json, os, sys
import numpy as np
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from common import FILES, SR, load, save, highpass
import noisereduce as nr
from stage1_lib import apply_plan
vm = sys.argv[1]
x = highpass(load(os.path.join(vm, "originals", FILES["00-intro"])), 70, order=4)
hyb = load(os.path.join(vm, "work", "variants2", "00-intro_hybrid.wav"))  # already edited (for reference only)
steps = [tuple(s) for s in json.load(open(os.path.join(vm, "work", "00-intro_edits.json")))["steps"]]
n = int(0.05 * SR); fr = x[: len(x) // n * n].reshape(-1, n)
db = 20 * np.log10(np.sqrt((fr**2).mean(1)) + 1e-10); quiet = fr[db < np.percentile(db, 15)].ravel()
def gate(p): return nr.reduce_noise(y=x, sr=SR, y_noise=quiet, stationary=True, prop_decrease=p, n_std_thresh_stationary=1.5, n_fft=2048, win_length=1024, hop_length=256, freq_mask_smooth_hz=300, time_mask_smooth_ms=40)
def region(sig, a=0.36, b=0.90, gain=8.0, ramp=0.03):
    w = np.zeros(len(sig)); w[int(a*SR):int(b*SR)] = 1; k = int(ramp*SR); w = np.convolve(w, np.ones(k)/k, "same")
    return w, sig * 10 ** (w * gain / 20)
out = os.path.join(vm, "work", "variants3")
for tag, p in (("raw", 0.0), ("nr30", 0.3), ("nr50", 0.5), ("nr70", 0.7)):
    sig = x if p == 0 else gate(p)
    w, boosted = region(sig)
    save(os.path.join(out, f"00-intro_lights_{tag}.wav"), apply_plan(boosted, steps)[: 7 * SR])
