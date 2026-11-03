import numpy as np
from common import SR, splice


def apply_plan(x, steps):
    parts = []
    for st in steps:
        if st[0] == "keep":
            parts.append(x[int(st[1] * SR) : int(st[2] * SR)])
        else:
            parts.append(np.zeros(int(st[1] * SR)))
    y = splice([p for p in parts if len(p)])
    n_in, n_out = int(0.01 * SR), int(0.12 * SR)
    y[:n_in] *= np.sin(np.linspace(0, np.pi / 2, n_in)) ** 2
    y[-n_out:] *= np.cos(np.linspace(0, np.pi / 2, n_out)) ** 2
    return y

