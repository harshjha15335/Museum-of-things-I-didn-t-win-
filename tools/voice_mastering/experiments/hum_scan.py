"""List narrow spectral lines (hum, whine) in the quiet parts of a take: frequency, prominence over the local median.

Usage: python hum_scan.py <wav> [fmax]
"""
import sys

import numpy as np
from scipy.ndimage import median_filter
from scipy.signal import welch

sys.path.insert(0, __file__.rsplit("/", 2)[0])
from common import SR, load  # noqa: E402

x = load(sys.argv[1])
fmax = float(sys.argv[2]) if len(sys.argv) > 2 else 2000
n = int(0.05 * SR)
fr = x[: len(x) // n * n].reshape(-1, n)
db = 20 * np.log10(np.sqrt((fr**2).mean(1)) + 1e-12)
quiet = np.concatenate([fr[i] for i in np.where(db < np.percentile(db, 20))[0]])
whole = x
for label, sig in (("quiet parts", quiet), ("whole take", whole)):
    f, p = welch(sig, SR, nperseg=65536)
    lp = 10 * np.log10(p + 1e-20)
    base = median_filter(lp, size=41)
    prom = lp - base
    m = (f > 20) & (f < fmax)
    idx = [i for i in np.where(m)[0] if prom[i] > 8 and lp[i] == lp[i - 3 : i + 4].max()]
    print(f"{label} ({len(sig) / SR:.1f} s): " + ", ".join(f"{f[i]:.1f} Hz +{prom[i]:.0f}" for i in idx))
