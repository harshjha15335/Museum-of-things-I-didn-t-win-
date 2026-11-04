"""SQUIM no-reference estimates for the stage-1 variants (which cleaner leaves the fewest artefacts)."""
import os, sys
import numpy as np, torch
from scipy.signal import resample_poly
sys.path.insert(0, os.path.dirname(__file__))
from common import FILES, load, lufs
from torchaudio.pipelines import SQUIM_OBJECTIVE
torch.set_num_threads(4)
m = SQUIM_OBJECTIVE.get_model().eval()
vdir = sys.argv[1]; variants = sys.argv[2].split(',')
print('file'.ljust(14), ' | '.join(v.rjust(18) for v in variants))
for n in FILES:
    row = []
    for v in variants:
        p = os.path.join(vdir, f'{n}_{v}.wav')
        x = resample_poly(load(p), 1, 3); x = x * 10 ** ((-23 - lufs(x, 16000)) / 20)
        with torch.no_grad():
            s, q, d = m(torch.from_numpy(x.astype(np.float32))[None])
        row.append(f'{float(s):.3f}/{float(q):.2f}/{float(d):4.1f}')
    print(n.ljust(14), ' | '.join(r.rjust(18) for r in row), flush=True)
