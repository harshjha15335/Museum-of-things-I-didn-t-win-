# The Museum of Things I Didn't Win

A playable, voice-narrated, 3D-on-rails museum that tells Harsh Jha's story through the attempts that didn't win.
Built for the Wispr Flow India growth hiring challenge. Independent application, not an official Wispr Flow site.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build into dist/
```

Handy URLs while reviewing:

- `/#station=samsung` jumps straight to a station (`lobby`, `samsung`, `hackerrank`, `corridor`, `gsoc`, `deadline`, `vault`).
- `/?2d` forces the text fallback (also used automatically under 768px wide or without WebGL).

## Controls

Next exhibit: button, `→` / `PageDown`, one scroll notch, or swipe left. Back: `←` / `PageUp`, scroll up, swipe right.
Inspect: click the glowing artifact, the Inspect button, or `Enter` / `Space`. `R` replays narration, `S` skips, `Shift+M` mutes.

## Where things live

| Path | What |
| --- | --- |
| `src/content/exhibits.ts` | **All copy**: plaques, narration cues (start/end seconds), quick lines, cards, evidence, experiment data. Components never hard-code story text. |
| `src/state/store.ts` | Station, mode (full / quick), per-exhibit state machine, mute, UI flags. |
| `src/audio/narration.ts` | Caption clock. Uses the recording's time when `audio` is set on an exhibit, otherwise a timer. |
| `src/scene/` | Hall, lights, camera rig, spotlights, exhibits. |
| `src/ui/` | HTML overlay: top bar, plaque, dossier, captions, Next, toast, start screen, footer. |
| `public/audio/` | Drop `00-prologue.mp3` … `05-vault.mp3` here, then uncomment `audio:` in the content file and re-sync cue timings. |

## Look (v2.2)

On Harsh's request the colour scheme and architecture were reworked to sit much closer to the spec's reference screenshots, without copying them: near-black charcoal, warm isolated exhibit light, red security rings and lasers, a mirror-dark floor, room dividers with vertical light strips, tall numbered room banners, a gold floor guide line and a taller, hazy lobby. GSoC keeps a gold ring as the one success. Tokens live in `src/scene/palette.ts` and `src/styles.css`.

## Build status (spec Part G)

- [x] **Phase 1**: setup, content file, hall, camera rig with every station, top bar, plaque, captions (timer mode), Next, footer, start screen, Lobby and Samsung end to end. Quick Tour runs too.
- [ ] Phase 2: HackerRank, Corridor microgame, GSoC, Map, Evidence drawer
- [ ] Phase 3: Deadline, Vault, Vault panel, Exit panel, reduced-motion polish
- [ ] Phase 4: recordings, ambient + stings, real 2D mobile stage, performance pass, deploy
- [ ] Phase 5–6: real experiment numbers, final copy, QA, submit

Open inputs still marked `TODO` in the content file: ASTFLOW repo URL, QC-Devs FFprime URL and PRs, the six narration recordings, voice-build clips, experiment data, $3,000 answer, start date, video URL, contact.
