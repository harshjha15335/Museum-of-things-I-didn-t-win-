"""Build patched/<name>.wav for every section in common.PATCHES: re-recorded single words joined into the take.

Usage: python make_patches.py <vm dir> [--only=name,name]

Per patch (fields explained next to PATCHES in common.py):
 1. Pick-up clean-up: the 100.3 Hz hum line notched out (Q 30, zero-phase), then light stationary noise
    reduction (70 %, profile = its quietest frames) so its own background sits well under the take's room tone.
 2. Intonation: Praat PSOLA to the target pitch points, keeping the pick-up's own small pitch movements.
 3. Tone: 1/3-octave EQ from pitch-adaptive spectral envelopes (WORLD CheapTrick) of the same vowels in the take
    and the pick-up: median over the word pairs, smoothed over 3 bands, 80 %, clamped to +-4 dB.
 4. Level: the stressed vowel's loudest 30 ms set to the take's reference span + dB; extra span gains; cuts.
 5. Assembly over the take's own room tone (its quietest 0.3 s near the join, tiled with alternate copies
    reversed), equal-power crossfades: 40 ms in pauses, 10 ms in a stop closure.
Writes patched/<name>.wav (48 kHz, 24-bit) and reports/measurements/patches.json (every number used/measured).
Patches are applied latest-first, so each one's take times are still the original take's.
"""
import json
import os
import sys

import noisereduce as nr
import numpy as np
import parselmouth
import pyworld as pw
from parselmouth.praat import call
from scipy.signal import butter, filtfilt, iirnotch, sosfiltfilt

sys.path.insert(0, os.path.dirname(__file__))
from common import FILES, PATCHES, PICKUPS, SR, fir_eq, highpass, load, save  # noqa: E402

pos = [a for a in sys.argv[1:] if not a.startswith("--")]
ONLY = [n for a in sys.argv if a.startswith("--only=") for n in a[7:].split(",")]
vm = pos[0]
os.makedirs(os.path.join(vm, "patched"), exist_ok=True)
os.makedirs(os.path.join(vm, "reports", "measurements"), exist_ok=True)
SOS_BP = butter(4, (120, 4000), btype="band", fs=SR, output="sos")
BANDS = [100, 125, 160, 200, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600, 2000, 2500, 3150, 4000, 5000, 6300]


def dehum(x, f=100.3, q=30.0):
    b, a = iirnotch(f, q, SR)
    return filtfilt(b, a, x)


def light_nr(x, prop=0.7):
    n = int(0.05 * SR)
    fr = x[: len(x) // n * n].reshape(-1, n)
    db = 20 * np.log10(np.sqrt((fr**2).mean(1)) + 1e-12)
    quiet = fr[db < np.percentile(db, 15)].ravel()
    return nr.reduce_noise(y=x, sr=SR, y_noise=quiet, stationary=True, prop_decrease=prop, n_std_thresh_stationary=1.5,
                           n_fft=2048, win_length=1024, hop_length=256, freq_mask_smooth_hz=300, time_mask_smooth_ms=40)


def frames_db(x, win=0.02):
    y = sosfiltfilt(SOS_BP, x)
    n = int(win * SR)
    fr = y[: len(y) // n * n].reshape(-1, n)
    return 20 * np.log10(np.sqrt((fr**2).mean(1)) + 1e-12)


def peak30(x, a, b):
    """Loudest 30 ms (5 ms hop) of x[a:b] in the 120-4000 Hz band, dBFS."""
    y = sosfiltfilt(SOS_BP, x[max(0, int((a - 0.1) * SR)) : int((b + 0.1) * SR)])[int(0.1 * SR) if a >= 0.1 else int(a * SR) :]
    y = y[: int((b - a) * SR)]
    n, h = int(0.03 * SR), int(0.005 * SR)
    e = max(np.mean(y[i : i + n] ** 2) for i in range(0, max(1, len(y) - n), h))
    return float(10 * np.log10(e + 1e-20))


def floor_db(x):
    return float(np.percentile(frames_db(x, 0.05), 10))


def envelope_db(x, a, b):
    seg = np.ascontiguousarray(x[int((a - 0.05) * SR) : int((b + 0.05) * SR)])
    f0, t = pw.harvest(seg, SR, f0_floor=60, f0_ceil=300, frame_period=5)
    sp = pw.cheaptrick(seg, f0, t, SR)
    m = (t >= 0.05) & (t <= 0.05 + b - a) & (f0 > 0)
    if m.sum() < 5:
        return np.full(len(BANDS), np.nan)
    e = 10 * np.log10(sp[m] + 1e-20).mean(0)
    f = np.linspace(0, SR / 2, sp.shape[1])
    return np.array([e[(f >= fc / 2 ** (1 / 6)) & (f < fc * 2 ** (1 / 6))].mean() for fc in BANDS])


def tone_curve(pick, hosts):
    """Take-minus-pick-up envelope difference on the same vowels (0 dB at 1 kHz), median over pairs."""
    pairs = [  # (pick-up span, take, take span): we /i/, AST /ae/, FLOW /ou/, hiring /ai/, challenge
        ((1.80, 2.02), "01-samsung", (23.95, 24.06)),
        ((8.78, 8.95), "01-samsung", (2.07, 2.20)),
        ((9.18, 9.38), "01-samsung", (2.30, 2.48)),
        ((6.00, 6.30), "04-deadline", (25.46, 25.70)),
        ((6.50, 6.85), "04-deadline", (25.85, 26.10)),
    ]
    rows = []
    pick = highpass(pick, 70, order=4)  # as stage 1 does; rumble upsets the pitch tracker
    hosts = {k: highpass(v, 70, order=4) for k, v in hosts.items()}
    for ps, h, hs in pairs:
        d = envelope_db(hosts[h], *hs) - envelope_db(pick, *ps)
        if np.all(np.isfinite(d)):
            rows.append(d - d[BANDS.index(1000)])
    med = np.median(rows, axis=0)
    sm = np.convolve(np.r_[med[0], med, med[-1]], np.ones(3) / 3, "valid")
    return np.clip(0.8 * sm, -4.0, 4.0), np.array(rows)


def psola(x, t0, points, stretch=()):
    """Re-pitch x (which starts at pick-up time t0) to the target points, keeping micro-variation; optional
    duration changes (a, b, factor) in pick-up time."""
    snd = parselmouth.Sound(x, sampling_frequency=SR)
    manip = call(snd, "To Manipulation", 0.005, 60, 320)
    pt = call(manip, "Extract pitch tier")
    n = int(call(pt, "Get number of points"))
    tt = np.array([call(pt, "Get time from index", i) for i in range(1, n + 1)])
    ff = np.array([call(pt, "Get value at index", i) for i in range(1, n + 1)])
    st = 12 * np.log2(ff / 100.0)
    micro = st - np.array([st[np.abs(tt - t) <= 0.025].mean() for t in tt])
    pt_t = np.array([p[0] - t0 for p in points])
    pt_st = 12 * np.log2(np.array([p[1] for p in points], float) / 100.0)
    new_st = np.interp(tt, pt_t, pt_st) + micro
    call(pt, "Remove points between", 0, snd.duration)
    for t, s in zip(tt, new_st):
        call(pt, "Add point", float(t), float(100 * 2 ** (s / 12)))
    call([manip, pt], "Replace pitch tier")
    if stretch:
        dt = call("Create DurationTier", "dt", 0, snd.duration)
        for a, b, f in stretch:
            a, b = a - t0, b - t0
            for t, v in ((a - 0.005, 1.0), (a, f), (b, f), (b + 0.005, 1.0)):
                call(dt, "Add point", t, v)
        call([manip, dt], "Replace duration tier")
    y = call(manip, "Get resynthesis (overlap-add)").values[0]
    n_out = len(x) + int(sum((f - 1) * (b - a) for a, b, f in stretch) * SR)
    y = y[:n_out] if len(y) >= n_out else np.r_[y, np.zeros(n_out - len(y))]
    shift = new_st - st
    return y, {"pick_hz": [round(float(ff.min())), round(float(ff.max()))],
               "new_hz": [round(float(100 * 2 ** (new_st.min() / 12))), round(float(100 * 2 ** (new_st.max() / 12)))],
               "shift_semitones": [round(float(shift.min()), 1), round(float(shift.max()), 1)]}


def span_gain(n, t0, spans, ramp=0.03):
    g = np.zeros(n)
    for a, b, db in spans:
        g[max(0, int((a - t0) * SR)) : max(0, int((b - t0) * SR))] = db
    k = int(ramp * SR)
    return 10 ** (np.convolve(np.r_[np.full(k, g[0]), g, np.full(k, g[-1])], np.ones(k) / k, "same")[k:-k] / 20)


def xjoin(a, b, n):
    t = np.linspace(0, np.pi / 2, n)
    return np.concatenate([a[:-n], a[-n:] * np.cos(t) + b[:n] * np.sin(t), b[n:]])


def cut(y, t0, spans, xf=0.01):
    n = int(xf * SR)
    for a, b in sorted(spans, reverse=True):
        i, j = int((a - t0) * SR), int((b - t0) * SR)
        y = xjoin(y[: i + n // 2], y[j - n // 2 :], n)
    return y


def room_tone(x, near, exclude, secs, target_db, win=0.3):
    """A 0.3 s stretch of the take's own pause near the join, as loud as the pause at the joins (not just the
    quietest: a file's first moments can be near-digital silence), tiled with alternate copies reversed."""
    n, hop = int(win * SR), int(0.01 * SR)
    cands = []
    for i in range(max(int(0.5 * SR), int(near[0] * SR)), min(len(x), int(near[1] * SR)) - n, hop):
        if i < exclude[1] * SR and i + n > exclude[0] * SR:
            continue
        fr = x[i : i + n]
        e = 10 * np.log10(np.mean(fr**2) + 1e-20)
        peak = 10 * np.log10(max(np.mean(fr[k : k + int(0.02 * SR)] ** 2) for k in range(0, n - int(0.02 * SR), int(0.01 * SR))) + 1e-20)
        if peak - e < 6:  # steady: no breath, click or word edge inside
            cands.append((abs(e - target_db), i, e))
    _, i, e = min(cands)
    seg = x[i : i + n]
    k = int(0.03 * SR)
    out = seg.copy()
    rev = True
    while len(out) < secs * SR + k:
        out = xjoin(out, seg[::-1] if rev else seg, k)
        rev = not rev
    return out[: int(secs * SR)], round(i / SR, 2), round(float(e), 1)


def level_at(x, t, win=0.05):
    return float(10 * np.log10(np.mean(x[int((t - win) * SR) : int((t + win) * SR)] ** 2) + 1e-20))


def quietest(x, a, b, win=0.005):
    n, hop = int(win * SR), int(0.001 * SR)
    e = [(float(np.mean(x[i : i + n] ** 2)), i) for i in range(int(a * SR), int(b * SR) - n, hop)]
    return (min(e)[1] + n // 2) / SR


pick_raw = load(os.path.join(vm, "originals", PICKUPS))
pick = light_nr(dehum(pick_raw))
hosts_raw = {n: load(os.path.join(vm, "originals", FILES[n])) for n in PATCHES}
curve, curve_rows = tone_curve(dehum(pick_raw), hosts_raw)
report = {"pickups": PICKUPS,
          "pickup_floor_dbfs": {"raw": round(floor_db(pick_raw), 1), "dehummed": round(floor_db(dehum(pick_raw)), 1),
                                "dehummed_nr": round(floor_db(pick), 1)},
          "tone_eq_db": dict(zip(map(str, BANDS), np.round(curve, 1).tolist())),
          "tone_pairs_db": np.round(curve_rows, 1).tolist(), "sections": {}}
print("tone EQ (dB):", " ".join(f"{b}:{g:+.1f}" for b, g in zip(BANDS, curve)))

for name, plist in PATCHES.items():
    if ONLY and name not in ONLY:
        continue
    x = hosts_raw[name].copy()
    host_floor = floor_db(x)
    sec = {"take": FILES[name], "take_floor_dbfs": round(host_floor, 1), "patches": []}
    for p in sorted(plist, key=lambda p: -p["host"][0]):  # latest first: earlier take times stay valid
        a0, a1 = p["pick"]
        seg = pick[int(a0 * SR) : int(a1 * SR)].copy()
        y, pinfo = psola(seg, a0, p["pitch"], p.get("stretch", ()))
        pad = np.zeros(int(0.1 * SR))
        y = fir_eq(np.r_[pad, y, pad], BANDS, curve)[len(pad) : len(pad) + len(y)]
        info = {"word": p["word"], "pick": p["pick"], "pitch": pinfo}
        if p["join"] == "pause":
            h0, h1 = p["host"]
            db = frames_db(x[int(h0 * SR) : int(h1 * SR)])
            loud = np.where(db > host_floor + 10)[0]
            w0, w1 = h0 + loud[0] * 0.02, h0 + (loud[-1] + 1) * 0.02
            j, r = w0 - 0.12, w1 + 0.06
            y_at = w0 - (p["onset"] - a0)  # pick-up onset lands where the take's word began
            xf_in = xf_out = int(0.04 * SR)
            info["take_word"] = [round(w0, 3), round(w1, 3)]
        else:
            ja, jb, r = p["host"]
            j = quietest(x, ja, jb)
            y_at = j
            xf_in, xf_out = int(0.01 * SR), int(0.04 * SR)
            info["join_db"] = round(float(10 * np.log10(np.mean(x[int((j - 0.0025) * SR) : int((j + 0.0025) * SR)] ** 2) + 1e-20)), 1)
        for ga, gb, gdb in p.get("host_gain", []):
            x = x * span_gain(len(x), 0.0, [(ga, j if gb is None else gb, gdb)], ramp=0.04)
        ref = peak30(x, *p["level"][0]) + p["level"][1]
        now = peak30(y, p["pick_level"][0] - a0, p["pick_level"][1] - a0)
        y = y * 10 ** ((ref - now) / 20) * span_gain(len(y), a0, p.get("gain", []))
        info.update({"level_ref_dbfs": round(ref, 1), "gain_db": round(ref - now, 1)})
        y = cut(y, a0, p.get("cut", []))
        f_in, f_out = int(0.005 * SR), int(0.03 * SR)
        y[:f_in] *= np.sin(np.linspace(0, np.pi / 2, f_in)) ** 2
        y[-f_out:] *= np.cos(np.linspace(0, np.pi / 2, f_out)) ** 2
        L = (y_at - j) + len(y) / SR + 0.06
        pause_db = level_at(x, r + 0.06) if p["join"] == "closure" else (level_at(x, j - 0.05) + level_at(x, r + 0.06)) / 2
        bed, bed_from, bed_db = room_tone(x, (j - 1.5, r + 1.5), (j - 0.05, r + 0.05), L, pause_db)
        info["pause_dbfs"] = round(pause_db, 1)
        region = bed.copy()
        k = int(round((y_at - j) * SR))
        region[k : k + len(y)] += y
        js, rs = int(round(j * SR)), int(round(r * SR))
        out = xjoin(x[: js + xf_in], region, xf_in)
        out = xjoin(out, x[rs - xf_out :], xf_out) if rs < len(x) else out
        shift = (len(out) - len(x)) / SR
        info.update({"join_at": round(j, 3), "take_resumes_at": round(r, 3), "room_tone_from": bed_from,
                     "room_tone_dbfs": bed_db, "new_word_s": round(len(y) / SR, 3),
                     "later_times_shift_s": round(shift, 3)})
        x = out
        sec["patches"].append(info)
        print(name, p["word"], json.dumps(info))
    save(os.path.join(vm, "patched", f"{name}.wav"), x)
    sec["patched_floor_dbfs"] = round(floor_db(x), 1)
    report["sections"][name] = sec
path = os.path.join(vm, "reports", "measurements", "patches.json")
old = json.load(open(path)) if os.path.exists(path) and ONLY else {}
old_sections = old.get("sections", {})
old_sections.update(report["sections"])
report["sections"] = old_sections
json.dump(report, open(path, "w"), indent=1)
