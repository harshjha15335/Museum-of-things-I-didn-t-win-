"""Subtitle timing: align the on-screen caption lines to the recognised words of each master.

Usage: python align_cues.py <asr.json> <key suffix, e.g. _C_master_dsp> <out.json> [backup suffix, e.g. _orig]

Caption words that the recogniser got right anchor the timing; words it misheard ("ASTFLOW") are
interpolated between their neighbours. Each caption starts 0.08 s before its first word and ends
0.15 s after its last, never overlapping the next one.
"""
import json
import os
import sys
from difflib import SequenceMatcher

sys.path.insert(0, os.path.dirname(__file__))
from common import norm_words  # noqa: E402

# Caption lines exactly as shown on screen, worded the way Harsh actually says them.
LINES = {
    "00-intro": [
        "Lights down. Doors locked. Welcome to the Harsh Jha Museum of Near Misses.",
        "Other museums guard their trophies.",
        "This one guards the near-misses: hackathons, bets and plans that didn't land.",
        "Harsh Jha. Computer science student, VIT Vellore.",
        "Known risk. Still hasn't learned to play it safe.",
        "Five case files. Each one: a call I made, what broke, and what I kept.",
        "Confidence is not evidence. So tonight, we go get the evidence.",
    ],
    "00-lobby": [
        "Welcome to the Museum of Near Misses.",
        "I am Harsh. Founder, curator, and prime suspect in most of these exhibits.",
        "Some people collect trophies.",
        "I collect character development.",
        "Five case files. Let's open them.",
    ],
    "01-samsung": [
        "Case file one: ASTFLOW.",
        "Three friends. One Samsung PRISM GenAI hackathon. One idea:",
        "make huge JavaScript codebases readable to the developers stuck inside them.",
        "No more pasting snippets into chatbots and praying.",
        "My job: the user flow and retrieval.",
        "We built it during exams. Notes in one window, code in the other.",
        "We were sure we'd qualify.",
        "We didn't.",
        "No reason was given, and I'm not going to make one up.",
        "But one question still follows me: did we validate as hard as we built?",
    ],
    "02-hackerrank": [
        "Case file two: HackerRank Orchestrate.",
        "Codex. Claude. Gemini. More AI in one room than any sane person should allow.",
        "I thought running them all at once was my edge.",
        "In my head, I was already near the top.",
        "I hit submit with validation errors still on the screen.",
        "Then the AI interview found gaps I couldn't explain.",
        "I had mistaken access to powerful tools for certainty about my result.",
        "More isn't better. Judgment is.",
    ],
    "03-gsoc": [
        "Case file three. This one's technically in the wrong museum.",
        "Applying to Google Summer of Code, I was scared my real strength,",
        "coordinating AI tools, would look like a weakness.",
        "I used it anyway. Carefully, this time.",
        "Selected: GSoC 2026, with QC-Devs.",
        "Three months learning what contributing to real open source actually means.",
        "No single heroic line of code here.",
        "Same tools. Better judgment.",
    ],
    "04-deadline": [
        "Case file four. The least flattering room in the building.",
        "Give me five days, and I used to spend three thinking I had lots of time,",
        "then cut features, then obsess over every detail on the last night.",
        "So I changed one rule: what has to be finished today gets finished today.",
        "Hours don't count. Done does.",
        "And yes, I see the irony of saying this in a timed hiring challenge.",
    ],
    "05-vault": [
        "Case file five. The vault.",
        "Every museum keeps one thing off the main floor. This is ours: our best-kept secret.",
        "We saved the best for last.",
        "Inside: the Wispr Flow campaign I ran during this challenge.",
        "I am a computer science student, applying to a growth team.",
        "My edge in growth: I don't just suggest the experiment. I build it, and I run it.",
        "And I built this whole museum by voice.",
        "This museum has no ending yet. That's why I am applying.",
    ],
}


def match_times(ref, words):
    hyp, hyp_t = [], []
    for w in words:
        for nw in norm_words(w["w"]):
            hyp.append(nw)
            hyp_t.append((w["s"], w["e"]))
    t = [None] * len(ref)
    for a, b, n in SequenceMatcher(None, ref, hyp, autojunk=False).get_matching_blocks():
        for k in range(n):
            t[a + k] = hyp_t[b + k]
    return t


def align(lines, words, dur, backup_words=None):
    """`backup_words`: a second recognition of the same timeline (the edited original); fills words
    the first one missed."""
    ref, owner = [], []
    for i, line in enumerate(lines):
        for w in norm_words(line):
            ref.append(w)
            owner.append(i)
    t = match_times(ref, words)
    if backup_words:
        for i, v in enumerate(match_times(ref, backup_words)):
            if t[i] is None and v is not None:
                t[i] = v
    # interpolate the unmatched words between anchors
    anchors = [i for i, v in enumerate(t) if v is not None]
    for i in range(len(ref)):
        if t[i] is None:
            prev = max([a for a in anchors if a < i], default=None)
            nxt = min([a for a in anchors if a > i], default=None)
            t0 = t[prev][1] if prev is not None else 0.0
            t1 = t[nxt][0] if nxt is not None else dur
            lo = prev if prev is not None else -1
            hi = nxt if nxt is not None else len(ref)
            step = (t1 - t0) / (hi - lo)
            t[i] = (t0 + step * (i - lo - 1), t0 + step * (i - lo))
    cues = []
    for i, line in enumerate(lines):
        idx = [k for k, o in enumerate(owner) if o == i]
        s, e = t[idx[0]][0] - 0.08, t[idx[-1]][1] + 0.15
        cues.append({"text": line, "start": max(0.0, round(s, 2)), "end": round(min(dur, e), 2),
                     "anchored": sum(1 for k in idx if k in anchors), "words": len(idx)})
    for a, b in zip(cues, cues[1:]):
        if a["end"] > b["start"]:
            a["end"] = round(max(a["start"] + 0.3, b["start"] - 0.02), 2)
    return cues


if __name__ == "__main__":
    asr, suffix, out = sys.argv[1:4]
    import soundfile as sf

    r = json.load(open(asr))
    res = {}
    for sec, lines in LINES.items():
        key = sec + suffix
        dur = r[key]["words"][-1]["e"] + 0.6
        backup = r.get(sec + sys.argv[4], {}).get("words") if len(sys.argv) > 4 else None
        res[sec] = align(lines, r[key]["words"], dur, backup)
        for c in res[sec]:
            print(f"{sec} {c['start']:6.2f}-{c['end']:6.2f} [{c['anchored']}/{c['words']}] {c['text']}")
    json.dump(res, open(out, "w"), indent=1)
