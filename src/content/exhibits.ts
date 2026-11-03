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
 * Narration is Harsh's own recording (public/audio, mastered from his takes). Caption start/end
 * times (seconds) come from forced alignment of each caption's words to its master
 * (tools/voice_mastering/force_align.py); caption wording follows what he actually says.
 * Re-run the alignment if a take is re-recorded.
 */

export type Cue = { text: string; start: number; end: number };

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
  audio?: string; // 'audio/01-samsung.mp3' (relative, so the build works under any base path)
  narration: Cue[];
  quickLine: string;
  cards?: Card[]; // lecterns, dossier, checklist, story-turn
  evidence: { label: string; url?: string; todo?: boolean }[];
  /** Short words painted onto 3D props (signs, labels). Not body copy. */
  props?: Record<string, string>;
};

export const site = {
  title: 'The Harsh Jha Museum of Near Misses',
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
  briefingTitleTop: 'The Harsh Jha Museum',
  briefingTitleBottom: 'of Near Misses',
  /** Home screen title, one line per row (last row in gold). */
  homeTitle: ['The Harsh Jha', 'Museum of', 'Near Misses'],
  homeEnter: 'Enter the museum',
  homeQuick: 'Quick tour · 90 s',
  /** The 5-second hook: what this is, who made it, why it exists. */
  briefingHook: 'A job application you can walk through.',
  briefingLine:
    "The hackathons and bets that almost worked, turned into a playable after-hours museum for the Wispr Flow growth challenge, and built by voice with Wispr Flow. The best part is locked in the vault.",
  briefingMeta: ['Full run ≈ 3 min', 'Quick recon ≈ 90 s', 'Sound optional'],
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
    audio: 'audio/00-lobby.mp3',
    narration: [
      { text: 'Welcome to the Museum of Near Misses.', start: 0.29, end: 2.32 },
      { text: 'I am Harsh. Founder, curator, and prime suspect in most of these exhibits.', start: 2.81, end: 7.81 },
      { text: 'Some people collect trophies.', start: 8.46, end: 9.93 },
      { text: 'I collect character development.', start: 10.3, end: 11.9 },
      { text: "Five case files. Let's open them.", start: 12.43, end: 14.36 },
    ],
    quickLine: 'Five near-misses, five case files, and what each one taught me.',
    evidence: [],
    props: {
      plaque: 'PLEASE DO NOT CONFUSE CONFIDENCE WITH EVIDENCE',
      band: 'THE HARSH JHA MUSEUM OF NEAR MISSES',
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
    audio: 'audio/01-samsung.mp3',
    narration: [
      { text: 'Case file one: ASTFLOW.', start: 0.25, end: 2.24 },
      { text: 'Three friends. One Samsung PRISM GenAI hackathon. One idea:', start: 2.61, end: 6.62 },
      { text: 'make huge JavaScript codebases readable to the developers stuck inside them.', start: 7.09, end: 11.29 },
      { text: 'No more pasting snippets into chatbots and praying.', start: 11.94, end: 14.59 },
      { text: 'My job: the user flow and retrieval.', start: 15.16, end: 17.39 },
      { text: 'We built it during exams. Notes in one window, code in the other.', start: 17.88, end: 21.41 },
      { text: "We were sure we'd qualify.", start: 21.9, end: 23.21 },
      { text: "We didn't.", start: 23.5, end: 24.07 },
      { text: "No reason was given, and I'm not going to make one up.", start: 24.51, end: 27.04 },
      { text: 'But one question still follows me: did we validate as hard as we built?', start: 27.77, end: 31.74 },
    ],
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
    audio: 'audio/02-hackerrank.mp3',
    narration: [
      { text: 'Case file two: HackerRank Orchestrate.', start: 0.23, end: 2.56 },
      { text: 'Codex. Claude. Gemini. More AI in one room than any sane person should allow.', start: 2.87, end: 7.86 },
      { text: 'I thought running them all at once was my edge.', start: 8.6, end: 10.83 },
      { text: 'In my head, I was already near the top.', start: 11.44, end: 13.49 },
      { text: 'I hit submit with validation errors still on the screen.', start: 14.04, end: 16.55 },
      { text: "Then the AI interview found gaps I couldn't explain.", start: 16.92, end: 19.47 },
      { text: 'I had mistaken access to powerful tools for certainty about my result.', start: 20.12, end: 23.53 },
      { text: "More isn't better. Judgment is.", start: 24.08, end: 26.04 },
    ],
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
    audio: 'audio/03-gsoc.mp3',
    narration: [
      { text: "Case file three. This one's technically in the wrong museum.", start: 0.23, end: 3.48 },
      { text: 'Applying to Google Summer of Code, I was scared my real strength,', start: 3.89, end: 7.32 },
      { text: 'coordinating AI tools, would look like a weakness.', start: 7.43, end: 10.12 },
      { text: 'I used it anyway. Carefully, this time.', start: 10.79, end: 13 },
      { text: 'Selected: GSoC 2026, with QC-Devs.', start: 13.45, end: 16.19 },
      { text: 'Three months learning what contributing to real open source actually means.', start: 16.7, end: 20.53 },
      { text: 'No single heroic line of code here.', start: 21.18, end: 23.09 },
      { text: 'Same tools. Better judgment.', start: 23.3, end: 24.83 },
    ],
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
    audio: 'audio/04-deadline.mp3',
    narration: [
      { text: 'Case file four. The least flattering room in the building.', start: 0.25, end: 3.08 },
      { text: 'Give me five days, and I used to spend three thinking I had lots of time,', start: 3.45, end: 7.09 },
      { text: 'then cut features, then obsess over every detail on the last night.', start: 7.34, end: 10.81 },
      { text: 'So I changed one rule: what has to be finished today gets finished today.', start: 11.12, end: 14.9 },
      { text: "Hours don't count. Done does.", start: 15.39, end: 17.4 },
      { text: 'And yes, I see the irony of saying this in a timed hiring challenge.', start: 17.93, end: 21.48 },
    ],
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
    title: 'Our best-kept secret',
    chapter: 'Chapter 5 · Constructive risk',
    bridge: 'We saved the best for last. Crack the vault.',
    hint: 'Hit the vault door to crack it, or press E',
    inspectLabel: 'Crack the vault',
    counted: true,
    station: {
      pos: [73.2, 1.8, 5.8],
      target: [77.2, 1.7, -2.2],
      fov: 44,
      pushIn: { pos: [74.9, 1.75, 4.3], target: [76.9, 1.65, -3.0] },
    },
    audio: 'audio/05-vault.mp3',
    // Campaign specifics come from Harsh (TODO). Only verified numbers, each with its denominator (spec Part I).
    narration: [
      { text: 'Case file five. The vault.', start: 0.19, end: 1.8 },
      { text: 'Every museum keeps one thing off the main floor. This is ours: our best-kept secret.', start: 2.27, end: 7.06 },
      { text: 'We saved the best for last.', start: 7.51, end: 9 },
      { text: 'Inside: the Wispr Flow campaign I ran during this challenge.', start: 9.21, end: 12.54 },
      { text: 'I am a computer science student, applying to a growth team.', start: 13.21, end: 15.76 },
      { text: "My edge in growth: I don't just suggest the experiment. I build it, and I run it.", start: 16.23, end: 20.61 },
      { text: 'And I built this whole museum by voice.', start: 21.18, end: 23.19 },
      { text: "This museum has no ending yet. That's why I am applying.", start: 23.58, end: 26.47 },
    ],
    quickLine: 'The vault: our best-kept secret, the Wispr Flow campaign I ran.',
    cards: [
      { id: 'campaign', label: 'The campaign', body: 'TODO' }, // TODO Harsh: what it was, who it reached, when
      { id: 'campaign-result', label: 'Results (verified only)', body: 'TODO' }, // TODO numbers with denominators
      { id: 'campaign-learned', label: 'What I learned', body: 'TODO' },
      { id: 'build-proof', label: 'Built by voice', body: 'Every change to this museum was asked for out loud through Wispr Flow.' },
    ],
    evidence: [
      { label: 'Campaign posts, screenshots or links', todo: true },
      { label: 'Clips of Harsh dictating the build via Wispr Flow', todo: true },
    ],
    props: {
      youAreHere: 'You are here',
      posterKicker: 'CASE FILE 05 · CLASSIFIED',
      posterTitle: 'THE WISPR CAMPAIGN',
      posterSub: 'Run by Harsh Jha · during this challenge',
      posterStamp: 'BEST FOR LAST',
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
/**
 * Harsh's recording of the intro. `start` = when the line begins in the recording (the card follows it);
 * `duration` = the camera move for that shot (CameraRig), evened out so no move is shorter than 3 s;
 * the durations add up to the recording plus a short hold.
 */
export const cutsceneAudio = 'audio/00-intro.mp3';

export const cutscene: { kicker?: string; line: string; start: number; duration: number }[] = [
  { kicker: 'After hours', line: 'Lights down. Doors locked. Welcome to the Harsh Jha Museum of Near Misses.', start: 0, duration: 4.9 },
  { line: 'Other museums guard their trophies.', start: 5.25, duration: 3 },
  { line: "This one guards the near-misses: hackathons, bets and plans that didn't land.", start: 7.55, duration: 5.11 },
  { kicker: 'The curator', line: 'Harsh Jha. Computer science student, VIT Vellore.', start: 13.01, duration: 3.66 },
  { line: "Known risk. Still hasn't learned to play it safe.", start: 16.67, duration: 3.43 },
  { line: 'Five case files. Each one: a call I made, what broke, and what I kept.', start: 20.1, duration: 5.86 },
  { kicker: 'House rule', line: 'Confidence is not evidence. So tonight, we go get the evidence.', start: 25.96, duration: 5.41 },
];

/** Gift shop (the $3,000 "oddly specific setup" answer) and exit desk (logistics), shown in the vault file. */
export const giftShop = {
  label: 'Gift shop',
  item: 'The $3,000 setup',
  body: 'TODO', // TODO Harsh: his oddly specific setup requirement
  price: '$3,000 · grant',
};

export const exitDesk = {
  label: 'Exit desk',
  rows: [
    { k: 'Role', v: 'TODO' }, // TODO: Internship / Full-time / Either
    { k: 'Earliest start', v: 'TODO' },
    { k: 'Bangalore', v: 'TODO' }, // TODO: based there / willing to travel
    { k: 'Built', v: '28 Oct – 4 Nov 2026, by voice' },
  ],
  hire: 'Hire the curator',
  share: 'Share this museum',
  shareText: "I walked through The Harsh Jha Museum of Near Misses, built by voice with Wispr Flow.",
};

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
