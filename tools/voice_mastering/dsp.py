"""Mastering building blocks (numpy/scipy only, 48 kHz mono float): match EQ, de-esser, expander,
compressor, true-peak limiter, loudness finishing, MP3 export and measurement."""
import subprocess

import numpy as np
from scipy.signal import resample_poly, welch

from common import SR, fir_eq, lufs, split_high, true_peak_db

# Voice-over target spectrum: third-octave band levels in dB relative to the 500 Hz band. This is the
# Byrne et al. (1994) long-term average speech spectrum, brightened by about 2 dB above 1 kHz, which
# is the usual tilt of a close-miked, presence-forward narration voice.
TARGET = {63: -14, 80: -9, 100: -4, 125: -2, 160: -1.5, 200: -1, 250: -1, 315: 0, 400: 0, 500: 0,
          630: -2, 800: -4, 1000: -6, 1250: -7.5, 1600: -8.5, 2000: -10, 2500: -11, 3150: -12,
          4000: -13, 5000: -14, 6300: -15, 8000: -16}
BANDS = sorted(TARGET)


def frames_db(x, win=0.05):
    n = int(win * SR)
    fr = x[: len(x) // n * n].reshape(-1, n)
    return fr, 20 * np.log10(np.sqrt((fr**2).mean(1)) + 1e-10)


def speech_only(x, above=15):
    fr, db = frames_db(x)
    return fr[db > np.percentile(db, 10) + above].ravel()


def band_levels(x):
    f, p = welch(x, SR, nperseg=8192)
    out = {}
    for fc in BANDS:
        m = (f >= fc / 2 ** (1 / 6)) & (f < fc * 2 ** (1 / 6))
        out[fc] = float(10 * np.log10(p[m].sum() + 1e-20))
    return out


def match_eq_curve(signals, amount=0.7, clamp=6.0, boost_lo=200, boost_hi=7500, air_cap=3.0):
    """One EQ for the whole set (same voice, mic and room, so every exhibit sounds alike).
    Partial (70 %) match toward TARGET, smoothed, clamped; cuts only below 200 Hz and above 7.5 kHz;
    at most +3 dB in the 5-6.3 kHz bands so sibilance is not pushed up."""
    M = band_levels(np.concatenate([speech_only(s) for s in signals]))
    g = np.array([TARGET[fc] - (M[fc] - M[500]) for fc in BANDS])
    g = np.convolve(np.r_[g[0], g, g[-1]], np.ones(3) / 3, "valid")
    g = np.clip(g * amount, -clamp, clamp)
    for i, fc in enumerate(BANDS):
        if fc < boost_lo or fc > boost_hi:
            g[i] = min(g[i], 0.0)
        if 4500 < fc <= boost_hi:
            g[i] = min(g[i], air_cap)
    return {fc: round(float(v), 2) for fc, v in zip(BANDS, g)}, {fc: round(v - M[500], 2) for fc, v in M.items()}


def apply_eq(x, curve):
    return fir_eq(x, list(curve.keys()), list(curve.values()))


def _env_db(x, win, ctrl):
    """RMS level in dB at a control rate of one value per `ctrl` samples (window `win` seconds)."""
    n = int(win * SR)
    e = np.convolve(x**2, np.ones(n) / n, "same")
    return 10 * np.log10(e[::ctrl] + 1e-12)


def _smooth(target_db, up_tc, down_tc, ctrl):
    """One-pole smoothing of a gain-reduction curve (dB, >= 0): `up_tc` while reduction grows."""
    dt = ctrl / SR
    a_up, a_dn = np.exp(-dt / up_tc), np.exp(-dt / down_tc)
    out = np.empty_like(target_db)
    s = 0.0
    for i, v in enumerate(target_db):
        a = a_up if v > s else a_dn
        s = a * s + (1 - a) * v
        out[i] = s
    return out


def _to_samples(curve_db, ctrl, n):
    t = np.arange(len(curve_db)) * ctrl
    return np.interp(np.arange(n), t, curve_db)


def deess(x, fc=5000, thr=-14.0, ratio=3.0, max_red=6.0, ctrl=24):
    """Split-band de-esser: when the band above `fc` carries more than `thr` dB of the total level
    (an "s", "sh" or "t" burst), turn only that band down (3:1, at most 6 dB, 1 ms / 40 ms)."""
    lo, hi = split_high(x, fc)
    d_hi, d_all = _env_db(hi, 0.004, ctrl), _env_db(x, 0.004, ctrl)
    active = d_all > np.percentile(d_all, 10) + 20
    over = np.where(active, np.maximum(0, (d_hi - d_all) - thr), 0)
    red = np.minimum(max_red, over * (1 - 1 / ratio))
    red = _smooth(red, 0.001, 0.04, ctrl)
    g = 10 ** (-_to_samples(red, ctrl, len(x)) / 20)
    return lo + hi * g, float(np.percentile(red[active], 99)) if active.any() else 0.0


def expander(x, thr_db, ratio=2.0, max_att=10.0, look=0.005, ctrl=48):
    """Gentle downward expander for the gaps between phrases (1:2 below `thr_db`, at most 10 dB).
    5 ms lookahead so word onsets open fully; opens in 2 ms, closes over 120 ms."""
    env = _env_db(x, 0.01, ctrl)
    k = max(1, int(look * SR / ctrl))
    env = np.max(np.lib.stride_tricks.sliding_window_view(np.r_[env, np.full(k, env[-1])], k + 1), axis=1)
    att = np.minimum(max_att, np.maximum(0, thr_db - env) * (ratio - 1))
    att = _smooth(att, 0.12, 0.002, ctrl)
    return x * 10 ** (-_to_samples(att, ctrl, len(x)) / 20)


def compressor(x, thr_db, ratio=2.2, knee=8.0, attack=0.008, release=0.15, ctrl=24):
    """Feed-forward RMS compressor (10 ms detector, soft knee)."""
    env = _env_db(x, 0.01, ctrl)
    over = env - thr_db
    slope = 1 - 1 / ratio
    gr = np.where(over <= -knee / 2, 0.0, np.where(over >= knee / 2, over * slope, slope * (over + knee / 2) ** 2 / (2 * knee)))
    gr = _smooth(gr, attack, release, ctrl)
    return x * 10 ** (-_to_samples(gr, ctrl, len(x)) / 20), float(np.percentile(gr, 95))


def tp_limit(x, ceiling_db, look=0.002, release=0.08):
    """True-peak limiter: peaks measured 4x oversampled, gain never above what each peak needs
    (symmetric min-filter then box average), 2 ms lookahead, 80 ms release."""
    lim = 10 ** (ceiling_db / 20)
    up = np.abs(resample_poly(x, 4, 1))[: 4 * len(x)].reshape(-1, 4).max(1)
    need = np.minimum(1.0, lim / np.maximum(up, 1e-9))
    if need.min() >= 1.0:
        return x
    w = max(1, int(look * SR))
    pad = np.r_[np.ones(w), need, np.ones(w)]
    mn = np.min(np.lib.stride_tricks.sliding_window_view(pad, 2 * w + 1), axis=1)
    h = w // 2
    avg = np.convolve(np.r_[np.ones(h), mn, np.ones(h)], np.ones(2 * h + 1) / (2 * h + 1), "valid")
    g = np.minimum(avg, need)
    # release: let the gain recover slowly (never above the requirement)
    a = np.exp(-1 / (release * SR))
    out = g.copy()
    idx = np.where(g < 1.0)[0]
    if len(idx):
        s = 1.0
        for i in range(idx[0], len(g)):
            s = min(g[i], 1 - a * (1 - s)) if s < 1 else g[i]
            out[i] = s
    return x * out


def finish(x, target_lufs, ceiling_db=-1.5, margin=0.3):
    """Normalise to `target_lufs` and hold the true peak at `ceiling_db` (verified, 4x oversampled)."""
    y = x * 10 ** ((target_lufs - lufs(x)) / 20)
    for _ in range(5):
        y = tp_limit(y, ceiling_db - margin)
        err = target_lufs - lufs(y)
        if abs(err) <= 0.05:
            break
        y = y * 10 ** (err / 20)
    y = tp_limit(y, ceiling_db - margin)
    assert true_peak_db(y) <= ceiling_db, true_peak_db(y)
    return y


def peak_normalise(x, ceiling_db=-1.5):
    return x * 10 ** ((ceiling_db - true_peak_db(x)) / 20)


def mp3(wav_path, mp3_path, bitrate="320k", title=None):
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-i", wav_path, "-codec:a", "libmp3lame", "-b:a", bitrate, "-ar", "48000", "-ac", "1"]
    if title:
        cmd += ["-metadata", f"title={title}", "-metadata", "artist=Harsh Jha"]
    subprocess.run(cmd + [mp3_path], check=True)


def decode(path):
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", path, "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"],
                         check=True, capture_output=True).stdout
    return np.frombuffer(raw, np.float32).astype(np.float64)


def ffmpeg_loudness(path):
    """Independent check with FFmpeg's EBU R128 meter: (integrated LUFS, LRA, true peak dBTP)."""
    err = subprocess.run(["ffmpeg", "-nostats", "-i", path, "-af", "ebur128=peak=true", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    tail = err[err.rfind("Summary:") :]

    def grab(key):
        line = next(l for l in tail.splitlines() if l.strip().startswith(key))
        return float(line.split(":")[1].split()[0])

    return grab("I:"), grab("LRA:"), grab("Peak:")


def lra(x):
    """Loudness range (EBU Tech 3342): ungated 3 s short-term loudness every 0.3 s, -70 LUFS absolute
    and -20 LU relative gates, 95th minus 10th percentile."""
    import pyloudnorm as pyln

    y = x.copy()
    for f in pyln.Meter(SR)._filters.values():  # K-weighting
        y = f.apply_filter(y)
    n, hop = 3 * SR, int(0.3 * SR)
    if len(y) < n:
        return float("nan")
    c = np.r_[0.0, np.cumsum(y**2)]
    ms = np.array([(c[i + n] - c[i]) / n for i in range(0, len(y) - n + 1, hop)])
    st = -0.691 + 10 * np.log10(ms + 1e-20)
    st = st[st > -70]
    if not len(st):
        return float("nan")
    st = st[st > 10 * np.log10(np.mean(10 ** (st / 10))) - 20]
    return float(np.percentile(st, 95) - np.percentile(st, 10))
