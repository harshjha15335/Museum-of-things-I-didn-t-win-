"""Stage 1 (Version A, clean): 48 kHz, gentle high-pass, DeepFilterNet3 denoise, then the edits.

Usage: python stage1_clean.py <vm dir> [variants dir name, default "variants"] [--only=name,name]

One edit plan is made per file in ORIGINAL time (retake cuts, an inserted breath, trim) and applied
identically to every variant, so all variants stay sample-aligned and comparable:
  orig       high-passed original (the baseline for every check)
  dfn_full   DeepFilterNet3, no attenuation limit
  dfn_lim24  DeepFilterNet3, suppression capped at 24 dB
  nr80       stationary spectral gating (noisereduce), 80 % reduction, noise profile = the file's quietest frames
  A          <- Version A: DeepFilterNet3 capped at 24 dB where there is speech, uncapped in the pauses, and
             "guarded": in any 20 ms frame that is clearly speech (9 dB over the noise floor) but lost more
             than 6 dB to DeepFilterNet, the spectral-gating result is used instead (1-5 % of frames).
How this was chosen (all measured, see reports/quality_report.md): speech recognition showed
DeepFilterNet treating soft, breathy or fricative sounds as noise even when capped ("Lights down" lost
24 dB; "file four" became "5.4"); spectral gating kept every word but a no-reference quality model
(SQUIM) scored it clearly below DeepFilterNet (estimated STOI 0.83-0.87 vs 0.90-0.94), i.e. artefacts.
The guarded blend keeps DeepFilterNet's cleanliness and the gate's word endings.
Clip gain (EDITS "gain") is applied after denoising, in original time, to every variant.
Writes work/<variants dir>/<name>_<variant>.wav, cleaned/<name>_A_clean.wav and work/<name>_edits.json.
"""
import json
import os
import sys

import noisereduce as nr
import numpy as np
import torch
from df.enhance import enhance, init_df

sys.path.insert(0, os.path.dirname(__file__))
from common import EDITS, FILES, PATCHES, SPLICES, SR, frame_db, highpass, load, quietest_near, save, source, speech_segments, splice  # noqa: E402

pos = [a for a in sys.argv[1:] if not a.startswith("--")]
ONLY = [n for a in sys.argv if a.startswith("--only=") for n in a[7:].split(",")]
vm = pos[0]
VAR = os.path.join(vm, "work", pos[1] if len(pos) > 1 else "variants")
os.makedirs(VAR, exist_ok=True)
model, df_state, _ = init_df()  # DeepFilterNet3 from the local cache
assert df_state.sr() == SR


def room_tone(x, secs=2.0, win=0.4):
    """The file's own room tone: its quietest 0.4 s, tiled with crossfades to `secs`."""
    n, hop = int(win * SR), int(0.02 * SR)
    e = np.convolve(x**2, np.ones(n), "valid")[::hop]
    i = int(np.argmin(e)) * hop
    seg = x[i : i + n]
    return splice([seg] * int(np.ceil(secs / (win - 0.02)) + 1))[: int(secs * SR)]


def dfn(x, atten_lim, warm=None):
    """DeepFilterNet3. Its noise statistics start from zero, so the first ~0.5 s is handled badly
    (it ate "Lights down" and "Case file two"); 2 s of the file's own room tone is run through
    first and then dropped."""
    pad = warm if warm is not None else np.zeros(0)
    t = torch.from_numpy(np.r_[pad, x].astype(np.float32))[None]
    y = enhance(model, df_state, t, atten_lim_db=atten_lim)
    return y[0].numpy().astype(np.float64)[len(pad) :]


def lag_samples(a, b, max_lag=2000):
    """Lag of b against a (should be 0: enhance() compensates the STFT delay)."""
    n = min(len(a), len(b), SR * 10)
    c = np.correlate(a[:n], b[max_lag : n - max_lag], "valid")
    return max_lag - int(np.argmax(c))


def spectral_gate(x, prop=0.9):
    n = int(0.05 * SR)
    fr = x[: len(x) // n * n].reshape(-1, n)
    db = 20 * np.log10(np.sqrt((fr**2).mean(1)) + 1e-10)
    quiet = fr[db < np.percentile(db, 15)].ravel()
    return nr.reduce_noise(y=x, sr=SR, y_noise=quiet, stationary=True, prop_decrease=prop, n_std_thresh_stationary=1.5,
                           n_fft=2048, win_length=1024, hop_length=256, freq_mask_smooth_hz=300, time_mask_smooth_ms=40)


def clip_gain(x, regions, ramp=0.03):
    g = np.zeros(len(x))
    for a, b, db in regions:
        g[int(a * SR) : int(b * SR)] = db
    k = int(ramp * SR)
    g = np.convolve(g, np.ones(k) / k, "same")
    return x * 10 ** (g / 20)


def guard(orig, dfn_sig, gate_sig, above=9.0, max_att=6.0, margin=0.04, ramp=0.06):
    """Use the spectral-gate result wherever DeepFilterNet removed more than `max_att` dB from a frame
    that is clearly speech (`above` dB over the original's noise floor)."""
    eo, ed = frame_db(orig), frame_db(dfn_sig)
    hit = (eo > np.percentile(eo, 10) + above) & (eo - ed > max_att)
    w = np.zeros(len(orig))
    for i in np.where(hit)[0]:
        w[max(0, int((i * 0.02 - margin) * SR)) : min(len(orig), int((i * 0.02 + 0.02 + margin) * SR))] = 1.0
    k = int(ramp * SR)
    w = np.clip(np.convolve(w, np.ones(k) / k, "same"), 0, 1)
    return w * gate_sig + (1 - w) * dfn_sig, float(hit.mean())


def speech_mask(orig, full, pre=0.15, post=0.25, ramp=0.03):
    """1 where anyone could hear speech (original 6 dB over its floor, or the denoised signal), else 0."""
    db_o, db_f = frame_db(orig), frame_db(full)
    on = (db_o > np.percentile(db_o, 10) + 6) | (db_f > np.percentile(db_f, 10) + 12)
    m = np.zeros(len(orig))
    for i in np.where(on)[0]:
        a = max(0, int((i * 0.02 - pre) * SR))
        b = min(len(orig), int((i * 0.02 + 0.02 + post) * SR))
        m[a:b] = 1.0
    k = int(ramp * SR)
    m = np.convolve(m, np.ones(k) / k, "same")
    return np.clip(m, 0, 1)


def make_plan(orig, full, name):
    """List of ('keep', a, b) and ('gap', seconds) steps, in original time."""
    ed = EDITS[name]
    dur = len(orig) / SR
    keeps = [[0.0, dur]]
    log = {"cuts": [], "pauses": [], "pause_caps": [], "trim": None}
    for a, b in ed["cuts"]:
        a2 = 0.0 if a == 0 else quietest_near(full, a)
        b2 = quietest_near(full, b)
        new = []
        for s, e in keeps:
            if e <= a2 or s >= b2:
                new.append([s, e])
            else:
                if s < a2:
                    new.append([s, a2])
                if e > b2:
                    new.append([b2, e])
        keeps = new
        log["cuts"].append([round(a2, 3), round(b2, 3)])
    # trim, from where the original rises 6 dB over its floor inside the kept audio
    db = frame_db(orig)
    fl = np.percentile(db, 10)
    t = np.arange(len(db)) * 0.02
    inside = np.zeros(len(db), bool)
    for s, e in keeps:
        inside |= (t >= s) & (t + 0.02 <= e)
    on = np.where((db > fl + 6) & inside)[0]
    t0 = max(keeps[0][0], on[0] * 0.02 - 0.3)
    t1 = min(keeps[-1][1], on[-1] * 0.02 + 0.02 + 0.6)
    keeps[0][0], keeps[-1][1] = t0, t1
    log["trim"] = [round(t0, 3), round(t1, 3)]
    # cap long silences (> 1.1 s between phrases -> 0.8 s)
    segs = speech_segments(full)
    capped = []
    for s, e in keeps:
        cur = s
        for (s0, e0), (s1, e1) in zip(segs, segs[1:]):
            if e0 >= cur and s1 <= e and s1 - e0 > 1.1:
                capped.append([cur, e0 + 0.4])
                cur = s1 - 0.4
                log["pause_caps"].append([round(e0, 2), round(s1, 2)])
        capped.append([cur, e])
    keeps = capped
    # inserted breaths
    steps = []
    pauses = sorted(ed["pauses"])
    for s, e in keeps:
        cur = s
        for tp, d in pauses:
            if s < tp < e:
                t2 = quietest_near(full, tp, span=0.05)
                steps.append(("keep", cur, t2))
                steps.append(("gap", d))
                cur = t2
                log["pauses"].append([round(t2, 3), d])
        steps.append(("keep", cur, e))
    return steps, log


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


for name, src in FILES.items():
    if ONLY and name not in ONLY:
        continue
    if name in PATCHES:
        src = f"patched/{name}.wav ({FILES[name]} + pick-ups: {', '.join(p['word'] for p in PATCHES[name])})"
    if name in SPLICES:
        src = " + ".join(f"{f}[{a}:{b}]{'' if not g else f' {g:+.1f} dB'}" for f, a, b, g in SPLICES[name])
    x = highpass(source(vm, name), 70, order=4)
    warm = room_tone(x)
    full, l24 = dfn(x, None, warm), dfn(x, 24.0, warm)
    lag = lag_samples(x, full)
    g80 = spectral_gate(x, 0.8)
    m = speech_mask(x, full)
    clean, guarded_share = guard(x, m * l24 + (1 - m) * full, g80)
    for a, b, prop in EDITS[name].get("protect", []):  # very soft phrases: lighter gating only
        w = np.zeros(len(x))
        w[int(a * SR) : int(b * SR)] = 1.0
        k = int(0.03 * SR)
        w = np.convolve(w, np.ones(k) / k, "same")
        clean = w * spectral_gate(x, prop) + (1 - w) * clean
    steps, log = make_plan(x, full, name)
    variants = {"orig": x, "dfn_full": full, "dfn_lim24": l24, "nr80": g80, "A": clean}
    gains = EDITS[name].get("gain", [])
    for v, sig in variants.items():
        y = apply_plan(clip_gain(sig, gains), steps)
        save(os.path.join(VAR, f"{name}_{v}.wav"), y)
        if v == "A":
            save(os.path.join(vm, "cleaned", f"{name}_A_clean.wav"), y)
    log.update({"src": src, "dfn_lag_samples": lag, "speech_mask_share": round(float(m.mean()), 3),
                "guarded_frames_share": round(guarded_share, 4), "clip_gain": gains, "protect": EDITS[name].get("protect", []),
                "dur_in": round(len(x) / SR, 2), "dur_out": round(len(apply_plan(x, steps)) / SR, 2),
                "steps": [[s[0]] + [round(v, 3) for v in s[1:]] for s in steps]})
    json.dump(log, open(os.path.join(vm, "work", f"{name}_edits.json"), "w"), indent=1)
    print(name, json.dumps({k: v for k, v in log.items() if k != "steps"}), flush=True)
