# Voice mastering: the Harsh Jha Museum of Near Misses narration

Everything here was processed locally (no cloud services). The originals are untouched copies of the uploads.

| Folder | What is in it |
|---|---|
| `originals/` | Every upload exactly as received (16 kHz, 16-bit, mono): the 7 takes in use, the intro's first take (replaced by the full retake of 4 Nov) and one upload of single-word pick-ups that is not used (why: `reports/recording_inventory.csv`). |
| `cleaned/` | **Version A, clean.** Noise removed, retakes cut, trimmed. No EQ or compression. Peak-normalised to -1.5 dBTP so it is easy to audition. |
| `enhanced/` | **Version B, enhanced.** `_dsp` = corrective + presence EQ. `_resemble` = Resemble Enhance (restores and regenerates the top octave the 16 kHz recording never had) + gentle EQ. `_re_raw` = Resemble Enhance output before EQ. |
| `mastered/` | **Version C, master.** `<name>_C_master.wav/.mp3` is the one the museum uses. `alternates/` has the master of the other path. -16 LUFS, true peak at or below -1.5 dBTP. |
| `video_mix_versions/` | The same masters at -18 LUFS, for laying under music in a video edit. |
| `comparisons/` | `_before_after.wav`: original, then the master, same loudness. `_all_versions.wav`: the first 10 s as original, A, B (DSP), C (DSP), B (Resemble), C (Resemble), 0.8 s apart, same loudness. Spectrogram PNGs. |
| `reports/` | `quality_report.md` (read this first), `recording_inventory.csv`, `loudness_report.csv`, `quality_tables.md`, `eq_curves.json`, `session_match_eq.json` (the intro retake's tone match to the first session), `selection.json`, and `measurements/` (raw QC and recognition output, edit logs, caption times). |
| `scripts/` | The whole pipeline. `batch_master.py` runs it end to end. |

Names: `00-intro` (opening cutscene), `00-lobby`, `01-samsung`, `02-hackerrank`, `03-gsoc`, `04-deadline`, `05-vault`.

## Swapping a version on the site

The site plays `public/audio/<name>.mp3` (128 kbps mono, encoded from the primary master). To use the other path,
encode its master the same way, for example:

```
ffmpeg -i mastered/alternates/01-samsung_C_master_dsp.wav -codec:a libmp3lame -b:a 128k -ar 48000 -ac 1 public/audio/01-samsung.mp3
```

If you re-record a room, record the whole room in one take (a single word patched into a sentence from another
session is easy to hear), add it to `FILES` and its first take to `FIRST_TAKES` in `scripts/common.py`, and re-run
that room: `stage1_clean.py <dir> variants2 --only=<name>`, then `stage2_master.py <dir> --only=<name> --reuse-eq`.
Then the caption timing: `scripts/force_align.py mastered/alternates out.json`
aligns the caption lines in `scripts/align_cues.py` (LINES) to the master and prints start/end times for
`src/content/exhibits.ts` (rooms) and the `cutscene` list (opening). Edit LINES first if the wording changed.
