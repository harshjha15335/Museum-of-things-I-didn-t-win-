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
  recoveredToast: 'Artifact recovered',
  lobbyNextHint: 'Next exhibit →',
  footer: 'Independent hiring-challenge application. Not an official Wispr Flow site.',
  captionLabel: 'Caption',
  replayLabel: 'Replay',
  skipLabel: 'Skip',
  muteLabel: 'Mute',
  unmuteLabel: 'Unmute',
  progressLabel: 'Recovered',
  pendingExhibitHint: 'This exhibit is still being installed.',
  noWebGL:
    'You are viewing the text edition of the museum. The illustrated phone version is still being installed.',
  closingLine: "This museum has no ending yet. That's why I'm applying.",
};

export const exhibits: Exhibit[] = [
  {
    id: 'lobby',
    number: '00',
    kicker: '00 · LOBBY',
    title: 'The Curator',
    hint: 'Welcome. The exhibits are to your right.',
    counted: false,
    station: { pos: [-2.6, 1.75, 5.6], target: [0.3, 1.25, -1.6], fov: 42 },
    // audio: '/audio/00-prologue.mp3',  // TODO: Harsh records
    narration: [
      { text: "Welcome to the Museum of Things I Didn't Win.", start: 0.3, end: 3.8 },
      { text: "I'm Harsh: founder, curator, and unfortunately the subject of most of the exhibits.", start: 4.0, end: 9.0 },
      { text: 'Some people collect trophies.', start: 9.3, end: 10.8 },
      { text: 'I collect character development.', start: 11.0, end: 12.6 },
      { text: 'Have a look around.', start: 12.8, end: 14.4 },
    ],
    quickLine: "A museum of attempts that didn't win, and what they taught me.",
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
    title: 'Three friends. One idea. No qualification.',
    hint: 'Click the glowing laptop — or press Enter',
    inspectLabel: 'Inspect',
    counted: true,
    station: {
      pos: [11.4, 1.75, 5.6],
      target: [14.3, 1.25, -1.6],
      fov: 42,
      pushIn: { pos: [12.8, 1.6, 2.6], target: [14, 1.3, -2.4] },
    },
    // audio: '/audio/01-samsung.mp3',  // TODO: Harsh records
    narration: [
      { text: 'This is ASTFLOW.', start: 0.3, end: 1.7 },
      { text: 'Three friends, one Samsung PRISM GenAI hackathon, and an idea:', start: 1.9, end: 5.8 },
      { text: 'help developers actually understand large JavaScript codebases', start: 6.0, end: 8.7 },
      { text: 'instead of pasting snippets into a chatbot and hoping.', start: 9.0, end: 12.4 },
      { text: 'I worked on the user flow and retrieval.', start: 12.7, end: 15.8 },
      { text: 'We built it during exams, studying in one window and coding in the other.', start: 16.0, end: 21.4 },
      { text: "We were sure we'd qualify.", start: 21.7, end: 23.6 },
      { text: "We didn't.", start: 23.8, end: 25.2 },
      { text: "No reason was given, so I won't invent one.", start: 25.5, end: 28.9 },
      { text: 'But I still ask: did we validate as hard as we built?', start: 29.2, end: 33.8 },
    ],
    quickLine: "ASTFLOW, Samsung PRISM: built hard during exams, didn't qualify. Lesson: validate as hard as you build.",
    cards: [
      { id: 'dossier-work', label: 'Work completed', body: 'Many hours.' },
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
    hint: 'Flip the RUN ALL AGENTS switch — or press Enter',
    inspectLabel: 'Run all agents',
    counted: true,
    station: { pos: [25.4, 1.75, 5.6], target: [28.3, 1.25, -1.6], fov: 42 },
    // audio: '/audio/02-hackerrank.mp3',  // TODO: Harsh records
    narration: [
      { text: 'HackerRank Orchestrate.', start: 0.3, end: 1.7 },
      { text: 'Codex, Claude, Gemini: more AI tools than any sensible person should put in one room.', start: 1.9, end: 7.7 },
      { text: 'I thought coordinating them all was my edge,', start: 8.0, end: 11.0 },
      { text: 'and I was already imagining a top finish.', start: 11.3, end: 14.4 },
      { text: 'I submitted with validation errors still on screen.', start: 14.6, end: 17.7 },
      { text: "Then the AI interview found gaps I couldn't explain.", start: 17.9, end: 21.4 },
      { text: "I'd confused access to powerful tools with certainty about the result.", start: 21.7, end: 25.9 },
      { text: "More isn't automatically better.", start: 26.1, end: 27.7 },
    ],
    quickLine: "HackerRank Orchestrate: every AI tool at once, errors at submission. Lesson: more isn't better.",
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
    hint: 'Slip past when the light is off the path — or just walk through',
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
    title: 'The exhibit that does not belong here',
    hint: 'Click the glass case — or press Enter',
    inspectLabel: 'Inspect',
    counted: true,
    station: { pos: [45.6, 1.7, 5.4], target: [48.2, 1.25, -1.2], fov: 42 },
    // audio: '/audio/03-gsoc.mp3',  // TODO: Harsh records
    narration: [
      { text: 'This exhibit is technically in the wrong museum.', start: 0.3, end: 3.4 },
      { text: 'Applying to Google Summer of Code, I worried that my real strength,', start: 3.6, end: 8.2 },
      { text: 'coordinating AI tools, was actually a weakness.', start: 8.5, end: 11.2 },
      { text: 'I used it anyway, but carefully this time.', start: 11.4, end: 14.5 },
      { text: 'I was selected for GSoC 2026 with QC-Devs', start: 14.8, end: 17.8 },
      { text: 'and spent three months learning what contributing to a real open-source project means.', start: 18.1, end: 23.1 },
      { text: "There's no single heroic line of code here.", start: 23.3, end: 26.4 },
      { text: 'Same tools. Different judgment.', start: 26.7, end: 28.2 },
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
    hint: 'Drag the clock hand from 1 to 5 — or press Watch animation',
    inspectLabel: 'Watch animation',
    counted: true,
    station: { pos: [60, 1.9, 5.6], target: [62.2, 1.9, -2.4], fov: 46 },
    // audio: '/audio/04-deadline.mp3',  // TODO: Harsh records
    narration: [
      { text: 'The least flattering room.', start: 0.3, end: 1.8 },
      { text: 'Give me five days and I used to spend three thinking I had plenty of time,', start: 2.1, end: 8.2 },
      { text: 'then cut features, then obsess over every detail on the last night.', start: 8.5, end: 13.1 },
      { text: 'So I changed one rule: what must be finished today gets finished today.', start: 13.4, end: 18.4 },
      { text: "Hours don't count; done does.", start: 18.6, end: 20.5 },
      { text: 'And yes, I see the irony of saying this in a time-limited hiring challenge.', start: 20.8, end: 26.2 },
    ],
    quickLine: 'The deadline paradox, and the daily rule that fixes it.',
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
    hint: 'Open the vault door — or press Enter',
    inspectLabel: 'Open vault',
    counted: true,
    station: { pos: [73.2, 1.8, 5.8], target: [76.4, 1.7, -2.2], fov: 44 },
    // audio: '/audio/05-vault.mp3',  // TODO: Harsh records
    // Narration follows experiment.status (spec I3). While the test is `not_launched`,
    // the "ran a small voice test" sentence is removed. When results exist, add
    // ONE verified result + ONE honest learning (max 25 words) after "So I built this museum by voice".
    narration: [
      { text: "And this is the newest exhibit. You're standing inside it.", start: 0.3, end: 4.1 },
      { text: "I'm a computer science student applying to a growth team.", start: 4.4, end: 8.2 },
      { text: 'What I like about Wispr is simple:', start: 8.5, end: 11.2 },
      { text: 'I say a messy thought out loud and get usable text back.', start: 11.4, end: 16.0 },
      { text: 'My edge in growth is that I can build the experiment, not just suggest it.', start: 16.3, end: 22.1 },
      { text: 'So I built this museum by voice.', start: 22.3, end: 25.0 },
      { text: "I don't know how this application ends.", start: 25.3, end: 28.0 },
      { text: "This museum has no ending yet. That's why I'm applying.", start: 28.2, end: 32.0 },
    ],
    quickLine: 'The newest exhibit: this museum, and a live voice test with students.',
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
