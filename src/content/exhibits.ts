/**
 * ALL story copy for the museum lives in this file (spec rule A/4).
 * Components never hard-code story text.
 *
 * Truth constraints (spec Part B3) — read before editing:
 *  - Samsung PRISM gave no rejection reason. Never state or imply one.
 *  - No HackerRank score, rank, leaderboard position or "top-N".
 *  - GSoC 2026 with QC-Devs is a three-month learning journey. No PR counts / metrics
 *    unless Harsh supplies them.
 *  - Experiment numbers only when verified, each with its denominator and source.
 *  - Anything not yet known is marked `todo: true` and renders as a labelled placeholder.
 *
 * Narration cue timings were initialised from word counts at 2.6 words/second.
 * Re-sync start/end (seconds) after Harsh records the audio — no code changes needed.
 */

export type Cue = { text: string; start: number; end: number };

/** Lay out cue timings from word count (2.6 words/s, 0.25 s gaps). Swap for real timings once recorded. */
const cues = (lines: string[]): Cue[] => {
  let t = 0.3;
  return lines.map((text) => {
    const d = Math.max(1.3, text.split(/\s+/).length / 2.6);
    const c = { text, start: +t.toFixed(2), end: +(t + d).toFixed(2) };
    t += d + 0.25;
    return c;
  });
};

export type ExhibitId =
  | 'lobby'
  | 'samsung'
  | 'hackerrank'
  | 'corridor'
  | 'gsoc'
  | 'deadline'
  | 'vault';

export type Vec3 = [number, number, number];

export type Station = {
  pos: Vec3;
  target: Vec3;
  fov: number;
  /** Optional explicit push-in camera (spec C3). Otherwise 35% toward the target. */
  pushIn?: { pos: Vec3; target: Vec3 };
};

export type Card = { id: string; label: string; body: string };

export type Exhibit = {
  id: ExhibitId;
  number: string; // '00'..'05', '—' for corridor
  kicker: string; // '01 · SAMSUNG PRISM / ASTFLOW'
  title: string; // plaque serif title
  /** Story chapter label (from the spec's emotional arc, Part B2). */
  chapter: string;
  /** One line shown on arrival that ties this room to the story so far. */
  bridge: string;
  hint: string; // 'Click the glowing laptop — or press Enter'
  inspectLabel?: string; // HTML button equivalent of the 3D artifact (spec F5)
  counted: boolean; // false for lobby & corridor
  station: Station;
  audio?: string; // '/audio/01-samsung.mp3' — set once the recording exists
  narration: Cue[];
  quickLine: string;
  cards?: Card[]; // lecterns, dossier, checklist, story-turn
  evidence: { label: string; url?: string; todo?: boolean }[];
  /** Short words painted onto 3D props (signs, labels). Not body copy. */
  props?: Record<string, string>;
};

export const site = {
  title: "The Museum of Things I Didn't Win",
  subtitle: 'A playable application by Harsh Jha · about 3 minutes · sound optional',
  tagline:
    "An exhibition of bad predictions, ambitious attempts, and one applicant who still hasn't learned to play it safe.",
  enterLabel: 'Enter museum',
  quickTourLabel: 'Quick tour',
  stopTourLabel: 'Stop tour',
  nextLabel: 'Next exhibit →',
  backLabel: '← Back',
  recoveredToast: 'Artifact secured',
  lobbyNextHint: 'Next exhibit →',
  footer: 'Independent hiring-challenge application. Not an official Wispr Flow site.',
  captionLabel: 'Caption',
  replayLabel: 'Replay',
  skipLabel: 'Skip',
  muteLabel: 'Mute',
  unmuteLabel: 'Unmute',
  progressLabel: 'Recovered',
  bannerLabel: 'EXHIBIT',
  pendingExhibitHint: 'This case file is still being assembled.',
  slateLabel: 'Read the slate',
  slateSign: 'READ ME',
  readerClose: 'Close',
  readerNarration: 'Narration',
  readerEvidence: 'Evidence',
  todoLabel: 'Classified · coming soon',
  synthVoiceNote: 'Placeholder synthetic voice · Harsh\'s own recording replaces it',
  skipIntro: 'Skip intro',
  musicOn: 'Music on',
  musicOff: 'Music off',
  pathLabel: 'Story path',
  noWebGL:
    'You are viewing the text edition of the museum. The illustrated phone version is still being installed.',
  closingLine: "This museum has no ending yet. That's why I'm applying.",
};

/** Heist-thriller HUD copy (UI rebuild, 3 Nov). Game voice; story facts stay in `exhibits`. */
export const hud = {
  briefingKicker: 'After-hours job · Case file HJ-26',
  briefingTitleTop: 'The Museum of',
  briefingTitleBottom: "Things I Didn't Win",
  briefingLine: "Five case files. Five near-misses. Get in, secure every artifact, and find out what each one cost.",
  briefingMeta: ['Run time ≈ 3 min', 'Sound optional', 'By Harsh Jha'],
  startJob: 'Start the job',
  startJobSub: 'Full run · opening briefing',
  quickRecon: 'Quick recon',
  quickReconSub: '90-second fly-through',
  objectiveLabel: 'Objective',
  objectiveLine: 'Secure all 5 artifacts',
  objectiveDone: 'All 5 secured. Make for the exit.',
  artifacts: {
    samsung: 'Case file 01 · ASTFLOW',
    hackerrank: 'Case file 02 · Orchestrate',
    gsoc: 'Case file 03 · GSoC',
    deadline: 'Case file 04 · Deadline',
    vault: 'Case file 05 · The vault',
  } as Record<string, string>,
  locationLabel: 'Location',
  promptRead: 'Read slate',
  promptInspect: 'Inspect',
  promptNext: 'Next room',
  promptBack: 'Back',
  promptReplay: 'Replay',
  promptSkip: 'Skip line',
  promptClose: 'Close file',
  speaker: 'Curator',
  toastRecovered: 'Artifact secured',
  toastObjective: 'Objective updated',
  dossierHeader: 'Case file',
  dossierStatus: 'Status',
  dossierStatusOpen: 'Open case',
  dossierStatusDone: 'Secured',
  transmission: 'Incoming · the curator',
  audioOn: 'Audio',
  musicLabel: 'Music',
  stopRecon: 'Take control',
};

export const exhibits: Exhibit[] = [
  {
    id: 'lobby',
    number: '00',
    kicker: '00 · LOBBY',
    title: 'The Curator',
    chapter: "Prologue · The curator",
    bridge: "Five case files. Five near-misses. Every one left something behind.",
    hint: 'The first case file is to your right.',
    counted: false,
    // Look slightly higher and wider than spec C3 so the taller atrium (ref 4) reads.
    station: { pos: [-2.6, 1.75, 5.6], target: [0.3, 1.6, -1.6], fov: 46 },
    // audio: '/audio/00-prologue.mp3',  // TODO: Harsh records
    narration: cues([
      "Welcome to the Museum of Things I Didn't Win.",
      "I'm Harsh. Founder, curator, and prime suspect in most of these exhibits.",
      'Some people collect trophies.',
      'I collect character development.',
      "Five case files. Let's open them.",
    ]),
    quickLine: 'Five near-misses, five case files, and what each one taught me.',
    evidence: [],
    props: {
      plaque: 'PLEASE DO NOT CONFUSE CONFIDENCE WITH EVIDENCE',
      band: "THE MUSEUM OF THINGS I DIDN'T WIN",
    },
  },
  {
    id: 'samsung',
    number: '01',
    kicker: '01 · SAMSUNG PRISM / ASTFLOW',
    title: 'Three friends. One idea. Not selected.',
    chapter: "Chapter 1 · Bruised certainty",
    bridge: 'The first job. Big effort, no result, and one question that stuck.',
    hint: 'Hit the glowing laptop or the slate, or press E',
    inspectLabel: 'Inspect',
    counted: true,
    station: {
      pos: [11.4, 1.75, 5.6],
      target: [14.3, 1.25, -1.6],
      fov: 42,
      pushIn: { pos: [12.8, 1.6, 2.6], target: [14, 1.3, -2.4] },
    },
    // audio: '/audio/01-samsung.mp3',  // TODO: Harsh records
    narration: cues([
      'Case file one: ASTFLOW.',
      'Three friends. One Samsung PRISM GenAI hackathon. One idea:',
      'make huge JavaScript codebases readable to the developers stuck inside them.',
      'No more pasting snippets into a chatbot and praying.',
      'My job: the user flow and the retrieval.',
      'We built it during exams. Notes in one window, code in the other.',
      "We were sure we'd qualify.",
      "We didn't.",
      "No reason was given, and I'm not going to make one up.",
      'But one question still follows me: did we validate as hard as we built?',
    ]),
    quickLine: 'ASTFLOW: built through exams, not selected. Takeaway: validate as hard as you build.',
    cards: [
      { id: 'dossier-work', label: 'Work completed', body: 'Many hours. Most of them during exams.' },
      { id: 'dossier-reason', label: 'Rejection reason', body: 'Not provided.' },
      { id: 'dossier-lesson', label: 'Lesson under investigation', body: 'Did we validate as hard as we built?' },
      {
        id: 'facts',
        label: 'Facts',
        body:
          'Built with two friends for the Samsung PRISM GenAI hackathon, during exams. Goal: help developers understand, debug and hand over large JavaScript codebases (file relationships, where functions are called) instead of pasting snippets into a chatbot. Harsh worked on user flow and retrieval (BM25, MMR). Team did not qualify; no reason given.',
      },
    ],
    evidence: [
      { label: 'ASTFLOW GitHub repository', todo: true }, // TODO URL — check the README matches this story
      { label: 'ASTFLOW screenshot (optional)', todo: true },
      { label: 'The code graph on the wall is an illustrative diagram, not a capture of the real tool.' },
    ],
    props: {
      // Illustrative code graph (spec B3: must carry an "Illustrative diagram" label)
      graphNodes: 'index.js|ui.flow.js|parser.js|retrieval.js|ranker.js',
      graphLabels: 'STRUCTURE|CALLS|RETRIEVAL',
      graphTags: 'BM25|MMR',
      illustrative: 'ILLUSTRATIVE DIAGRAM',
      stamp: 'NOT SELECTED',
      stampCue: "We didn't.",
      dossierTitle: 'Case file · ASTFLOW',
    },
  },
  {
    id: 'hackerrank',
    number: '02',
    kicker: '02 · HACKERRANK ORCHESTRATE',
    title: 'The More-is-Better Machine',
    chapter: "Chapter 2 · Over-confidence, exposed",
    bridge: 'Next job: when more tools start to feel like a guarantee.',
    // Phase 2 restores: hint 'Flip the RUN ALL AGENTS switch — or press Enter', inspectLabel 'Run all agents'
    hint: 'Hit the glowing slate, or press E',
    inspectLabel: 'Read the slate',
    counted: true,
    station: { pos: [25.4, 1.75, 5.6], target: [28.3, 1.25, -1.6], fov: 42 },
    // audio: '/audio/02-hackerrank.mp3',  // TODO: Harsh records
    narration: cues([
      'Case file two: HackerRank Orchestrate.',
      'Codex. Claude. Gemini. More AI in one room than any sane person should allow.',
      'I thought running them all at once was my edge.',
      'In my head, I was already near the top.',
      'I hit submit with validation errors still on the screen.',
      "Then the AI interview found gaps I couldn't explain.",
      "I'd mistaken access to powerful tools for certainty about the result.",
      "More isn't better. Judgment is.",
    ]),
    quickLine: "HackerRank Orchestrate: every AI tool at once, errors at submit. Takeaway: more isn't better.",
    cards: [
      {
        id: 'story-turn',
        label: 'Story turn',
        body: "I had access to more tools than ever. But the missing ingredient wasn't another agent. It was judgment.",
      },
      {
        id: 'facts',
        label: 'Facts',
        body:
          '24-hour event. Used several AI coding tools at once with high expectations; submitted with unresolved validation errors; the AI interview surfaced missing parts; the post-submission review changed his assessment.',
      },
    ],
    evidence: [],
    props: {
      monitors: 'CODEX|CLAUDE|GEMINI|AGENT 4|AGENT 5|AGENT 6|AGENT 7|AGENT 8|AGENT 9',
      switch: 'RUN ALL AGENTS',
      terminal: 'validation: unresolved warnings',
    },
  },
  {
    id: 'corridor',
    number: '—',
    kicker: '— · SECURITY CORRIDOR',
    title: 'Mind the spotlight',
    chapter: "Interlude · Security",
    bridge: 'Security checkpoint. Keep to the shadows.',
    hint: 'Wait for the light to sweep past, or just walk through',
    counted: false,
    station: { pos: [33, 1.7, 2.6], target: [40, 1.2, 0], fov: 50 },
    narration: [],
    quickLine: 'Security note: confidence does not bypass validation.',
    evidence: [],
    props: {
      slip: 'Slip past',
      through: 'Just let me through',
      caught: 'SECURITY NOTE: CONFIDENCE DOES NOT BYPASS VALIDATION.',
      clean: 'Clean exit.',
    },
  },
  {
    id: 'gsoc',
    number: '03',
    kicker: '03 · GSOC 2026 / QC-DEVS',
    title: "The one that doesn't belong here",
    chapter: "Chapter 3 · Changed judgment",
    bridge: 'Then the plan changed. Same tools, different hands on them.',
    // Phase 2 restores: hint 'Click the glass case — or press Enter'
    hint: 'Hit the glowing slate, or press E',
    inspectLabel: 'Read the slate',
    counted: true,
    station: { pos: [45.6, 1.7, 5.4], target: [48.2, 1.25, -1.2], fov: 42 },
    // audio: '/audio/03-gsoc.mp3',  // TODO: Harsh records
    narration: cues([
      "Case file three. This one's technically in the wrong museum.",
      'Applying to Google Summer of Code, I was scared my real strength,',
      'coordinating AI tools, would look like a weakness.',
      'I used it anyway. Carefully, this time.',
      'Selected: GSoC 2026, with QC-Devs.',
      'Three months learning what contributing to real open source actually means.',
      'No single heroic line of code here.',
      'Same tools. Better judgment.',
    ]),
    quickLine: 'GSoC 2026 with QC-Devs: same tools, used with judgment. Selected.',
    cards: [
      {
        id: 'uncertainty',
        label: 'Uncertainty',
        body:
          'Applying, I worried that other applicants knew codebases better than me, and that leaning on AI tools might count as a weakness.',
      },
      {
        id: 'contribution',
        label: 'Contribution',
        body: "Three months contributing to an open-source organization's codebase. No single hero commit; a sustained process.",
      },
      {
        id: 'context',
        label: 'Context',
        body: "The difference from HackerRank wasn't the tools. It was using them with judgment, inside a real project.",
      },
      { id: 'title-card', label: 'Title card', body: 'WHY IS A SUCCESS IN THIS MUSEUM?' },
    ],
    evidence: [
      { label: 'QC-Devs FFprime repository', todo: true }, // TODO URL
      { label: "Harsh's pull requests or screenshots", todo: true }, // TODO if available
    ],
    props: {
      wallLine: 'QC-DEVS · FFPRIME · GOOGLE SUMMER OF CODE 2026',
    },
  },
  {
    id: 'deadline',
    number: '04',
    kicker: '04 · THE DEADLINE PARADOX',
    title: 'Five days, one brain',
    chapter: "Chapter 4 · Self-awareness",
    bridge: 'The flaw under every file, and the rule that patched it.',
    // Phase 3 restores: hint 'Drag the clock hand from 1 to 5 — or press Watch animation', inspectLabel 'Watch animation'
    hint: 'Hit the glowing slate, or press E',
    inspectLabel: 'Read the slate',
    counted: true,
    station: { pos: [60, 1.9, 5.6], target: [62.2, 1.9, -2.4], fov: 46 },
    // audio: '/audio/04-deadline.mp3',  // TODO: Harsh records
    narration: cues([
      'Case file four. The least flattering room in the building.',
      'Give me five days, and I used to spend three thinking I had loads of time,',
      'then cut features, then obsess over every detail on the last night.',
      'So I changed one rule: what has to be finished today gets finished today.',
      "Hours don't count. Done does.",
      'And yes, I see the irony of saying this in a timed hiring challenge.',
    ]),
    quickLine: 'The deadline paradox, and the one daily rule that patched it.',
    cards: [
      {
        id: 'checklist',
        label: 'The daily checklist',
        body: "What must be finished today · gets finished today · Hours don't count; done does.",
      },
      { id: 'checklist-footer', label: 'This week', body: 'THIS WEEK: DO NOT TURN THE METAPHOR INTO A DOCUMENTARY.' },
    ],
    evidence: [],
    props: {
      day1: 'Scope: everything',
      day2: 'still everything',
      day3: 'everything, honestly',
      day4: 'Scope: cut',
      day5: 'cut further',
    },
  },
  {
    id: 'vault',
    number: '05',
    kicker: '05 · THE VAULT',
    title: 'The unfinished exhibit',
    chapter: "Chapter 5 · Constructive risk",
    bridge: "Last file. The one you're standing in.",
    // Phase 3 restores: hint 'Open the vault door — or press Enter', inspectLabel 'Open vault'
    hint: 'Hit the glowing slate, or press E',
    inspectLabel: 'Read the slate',
    counted: true,
    station: { pos: [73.2, 1.8, 5.8], target: [76.4, 1.7, -2.2], fov: 44 },
    // audio: '/audio/05-vault.mp3',  // TODO: Harsh records
    // Narration follows experiment.status (spec I3). While the test is `not_launched`,
    // the "ran a small voice test" sentence is removed. When results exist, add
    // ONE verified result + ONE honest learning (max 25 words) after "So I built this museum by voice".
    narration: cues([
      "Case file five. The newest exhibit. You're standing inside it.",
      "I'm a computer science student, applying to a growth team.",
      "Here's what I like about Wispr: I say a messy thought out loud and get usable text back.",
      "My edge in growth: I don't just suggest the experiment. I build it.",
      'So I built this museum by voice.',
      "I don't know how this application ends.",
      "This museum has no ending yet. That's why I'm applying.",
    ]),
    quickLine: 'The final file: this museum, built by voice.',
    cards: [
      { id: 'build-proof', label: 'Built by voice', body: 'This museum was built by speaking.' },
      { id: 'setup', label: 'Gift shop · $3,000 setup', body: 'TODO' },
      { id: 'start', label: 'Earliest start', body: 'TODO' },
    ],
    evidence: [
      { label: 'Clips of Harsh dictating the build via Wispr Flow', todo: true },
      { label: 'Words dictated (only if Wispr shows it)', todo: true },
    ],
    props: {
      youAreHere: 'You are here',
    },
  },
];

/** Five-Minute Voice Test (spec Part I). Only verified numbers, each with its denominator. */
export const experiment: {
  status: 'not_launched' | 'live' | 'complete';
  launchedAt?: string;
  funnel: { invited?: number; responses?: number; tried?: number; preferVoice?: number };
  byChannel?: { channel: string; invited: number }[];
  quotes?: { text: string; consent: true }[];
  learning?: string;
  changed?: string;
  limitations?: string;
} = {
  status: 'not_launched',
  funnel: {},
};

/**
 * Opening cutscene (Harsh's request, 3 Nov): who he is, told in the museum's voice.
 * Facts only from the spec: CS student, VIT Vellore, applying to a growth team, the
 * tagline and the "confidence is not evidence" motif. Each shot pairs with a camera move
 * in src/scene/cutscenePath.ts (same order).
 */
export const cutscene: { kicker?: string; line: string; duration: number }[] = [
  { kicker: 'After hours', line: "Lights down. Doors locked. Welcome to the Museum of Things I Didn't Win.", duration: 5.4 },
  { line: 'Other museums guard their trophies.', duration: 3.8 },
  { line: "This one guards the near-misses: hackathons, bets and plans that didn't land.", duration: 5.4 },
  { kicker: 'The curator', line: 'Harsh Jha. Computer science student, VIT Vellore.', duration: 4.6 },
  { line: "Known risk. Still hasn't learned to play it safe.", duration: 4 },
  { line: 'Five case files. Each one: a call I made, what broke, and what I kept.', duration: 5.2 },
  { kicker: 'House rule', line: 'Confidence is not evidence. So tonight, we go get the evidence.', duration: 5.2 },
];

export const exitPanel = {
  closing: "THIS MUSEUM HAS NO ENDING YET. THAT'S WHY I'M APPLYING.",
  links: [
    { label: 'Watch the 3-minute video', todo: true }, // TODO URL
    { label: 'LinkedIn', url: 'https://www.linkedin.com/in/harsh-jha-5a828b327' },
    { label: 'GitHub', url: 'https://github.com/harshjha15335' },
    { label: 'Contact', todo: true }, // TODO
  ] as { label: string; url?: string; todo?: boolean }[],
};

export const countedExhibits = exhibits.filter((e) => e.counted);
export const stationIndex = (id: ExhibitId) => exhibits.findIndex((e) => e.id === id);
