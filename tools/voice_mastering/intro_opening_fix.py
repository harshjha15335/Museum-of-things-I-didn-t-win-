"""Stopgap for the intro's opening phrase, "Lights down. Doors locked." (run after stage1_clean.py).

Usage: python intro_opening_fix.py <vm dir> [lift dB, default 14] [gating 0-1, default 0.4] [phrase end s, default 1.98]

Measured problem: the recorder was still starting when "Lights" was said, so the take holds only a faint trace
of it (at or below the room noise in every band), and the neural denoiser blurred the consonants of the next
words (a recogniser heard "John, those logged" in the master, "Right down, doors locked" in the raw take).
Here the words of the phrase come from the high-passed original with light spectral gating, the pauses stay as
in Version A, and the faint trace of "Lights" (0-0.27 s) is lifted. Everything after the phrase is Version A.
Rewrites work/variants2/00-intro_A.wav; then run stage2_master.py --only=00-intro --reuse-eq.
This is not a substitute for re-recording the line: "Lights" itself cannot be recovered.
Used for the first take only: Harsh re-recorded the whole intro on 4 Nov (common.FIRST_TAKES), and the retake
needs none of this.
"""
import os
import sys

import noisereduce as nr
import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
from common import FIRST_TAKES, SPLICES, SR, load, save  # noqa: E402

if "00-intro" in FIRST_TAKES or "00-intro" in SPLICES:
    sys.exit("intro_opening_fix.py is for the first intro take only; the intro is now a retake or a splice")

vm = sys.argv[1]
lift_db = float(sys.argv[2]) if len(sys.argv) > 2 else 14.0
prop = float(sys.argv[3]) if len(sys.argv) > 3 else 0.4
end_t = float(sys.argv[4]) if len(sys.argv) > 4 else 1.98
o = load(os.path.join(vm, "work", "variants2", "00-intro_orig.wav"))
A = load(os.path.join(vm, "work", "variants2", "00-intro_A.wav"))
if os.path.exists(os.path.join(vm, "work", "variants2", "00-intro_A_before_opening_fix.wav")):
    A = load(os.path.join(vm, "work", "variants2", "00-intro_A_before_opening_fix.wav"))  # idempotent
else:
    save(os.path.join(vm, "work", "variants2", "00-intro_A_before_opening_fix.wav"), A)

# noise profile: the quietest 0.5 s of the take after its first second
n, hop = int(0.5 * SR), int(0.05 * SR)
e = [np.mean(o[i : i + n] ** 2) for i in range(SR, len(o) - n, hop)]
k = SR + int(np.argmin(e)) * hop
g = nr.reduce_noise(y=o, sr=SR, y_noise=o[k : k + n], stationary=True, prop_decrease=prop)


def ramp(mask, ms):
    r = max(1, int(ms / 1000 * SR))
    return np.clip(np.convolve(mask, np.ones(r) / r, "same"), 0, 1)


# speech mask from the original: 10 ms frames 8 dB over the take's floor, widened by 60 ms each side
f = int(0.01 * SR)
m = len(o) // f
db = 20 * np.log10(np.sqrt((o[: m * f].reshape(m, f) ** 2).mean(1)) + 1e-9)
sp = np.convolve((db > np.percentile(db, 10) + 8).astype(float), np.ones(13), "same") > 0
speech = ramp(np.repeat(sp.astype(float), f), 30)
speech = np.r_[speech, np.zeros(len(o) - len(speech))]
lights = np.zeros(len(o))
lights[: int(0.27 * SR)] = 1
lights = ramp(lights, 30)
words = np.maximum(speech, lights)
g = g * 10 ** (lift_db * lights / 20)
phrase = np.zeros(len(A))
phrase[: int(end_t * SR)] = 1
phrase = ramp(phrase, 40)
phrase[: int(0.04 * SR)] = 1
L = len(A)
out = phrase * (words[:L] * g[:L] + (1 - words[:L]) * A) + (1 - phrase) * A
save(os.path.join(vm, "work", "variants2", "00-intro_A.wav"), out)
print(f"opening fix: lift {lift_db:+.0f} dB on 0-0.27 s, gating {prop}, phrase 0-{end_t} s")
