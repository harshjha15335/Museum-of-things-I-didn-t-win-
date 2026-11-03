"""Pick the primary master: one path for all seven files, so the voice sounds the same in every room.

Usage: python select_master.py <vm dir> <qc.json> <asr.json>

Resemble Enhance becomes primary only if, in every file, compared with the DSP master of that file:
  - speaker similarity to the original (ECAPA) is at most 0.03 lower, and at least 0.75
  - word error rate is at most 2 points higher, and no fragile word is lost that the DSP master kept
  - median pitch stays within 3 Hz of the original
  - estimated PESQ (SQUIM) is not lower
Otherwise the DSP master is primary. Both stay in mastered/alternates/.
Copies the primary to mastered/<name>_C_master.{wav,mp3} and video_mix_versions/<name>_C_master_-18LUFS.{wav,mp3},
and writes reports/selection.json.
"""
import json
import os
import shutil
import sys

sys.path.insert(0, os.path.dirname(__file__))
from common import FILES  # noqa: E402

vm, qc_path, asr_path = sys.argv[1:4]
P = lambda *a: os.path.join(vm, *a)  # noqa: E731
qc, asr = json.load(open(qc_path)), json.load(open(asr_path))

checks, ok_all = {}, True
for n in FILES:
    q = qc[n]
    if "C_resemble" not in q:
        ok_all = False
        checks[n] = {"resemble": "not available"}
        continue
    d, r, o = q["C_dsp"], q["C_resemble"], q["original"]
    ad, ar = asr.get(f"{n}_C_master_dsp"), asr.get(f"{n}_C_master_resemble")
    lost = [w for w, v in ad["watch"].items() if v and not ar["watch"].get(w)] if ad and ar else []
    c = {
        "ecapa_dsp": d["ecapa"], "ecapa_resemble": r["ecapa"],
        "wer_dsp": ad["wer"] if ad else None, "wer_resemble": ar["wer"] if ar else None,
        "words_lost_vs_dsp": lost,
        "f0_original": o["f0_median"], "f0_resemble": r["f0_median"],
        "pesq_est_dsp": d["squim_pesq"], "pesq_est_resemble": r["squim_pesq"],
    }
    c["pass"] = bool(
        r["ecapa"] >= d["ecapa"] - 0.03 and r["ecapa"] >= 0.75
        and ad and ar and ar["wer"] <= ad["wer"] + 0.02 and not lost
        and abs(r["f0_median"] - o["f0_median"]) <= 3.0
        and r["squim_pesq"] >= d["squim_pesq"]
    )
    ok_all &= c["pass"]
    checks[n] = c

primary = "resemble" if ok_all else "dsp"
for n in FILES:
    for ext in ("wav", "mp3"):
        shutil.copy(P("mastered", "alternates", f"{n}_C_master_{primary}.{ext}"), P("mastered", f"{n}_C_master.{ext}"))
        shutil.copy(P("video_mix_versions", "alternates", f"{n}_C_video_-18LUFS_{primary}.{ext}"),
                    P("video_mix_versions", f"{n}_C_master_-18LUFS.{ext}"))
json.dump({"primary": primary, "checks": checks}, open(P("reports", "selection.json"), "w"), indent=1)
print("primary:", primary)
for n, c in checks.items():
    print(n, c)
