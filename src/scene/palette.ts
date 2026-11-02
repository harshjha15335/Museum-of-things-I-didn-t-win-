/**
 * Palette v2.2 — reworked on Harsh's request (2 Nov) to sit much closer to the reference
 * screenshots: the secured-gallery shot (ref 3, primary) for colour and light, the hall,
 * corridor, lobby and entrance shots (refs 1, 2, 4, 6) for architecture. Our own geometry;
 * nothing traced or copied.
 *
 * Near-black charcoal space, warm isolated exhibit light, red reserved for security
 * (plinth rings, lasers, warnings), gold for the guide line, banners, UI and the payoff.
 */
export const C = {
  plaster: '#ECE8E1', // text on dark, the few light objects
  stone: '#B9B4AC', // secondary text, light trims
  gunmetal: '#2A2C31', // desks, frames, beams, vault
  ink: '#131519', // UI panels, ceiling, clock face
  gold: '#E0B85A', // guide line, banners, outlines, progress, primary button, GSoC payoff
  red: '#C8323A', // security: rings, warning frames, stamp
  redEmissive: '#FF3B3B', // lasers and glowing rings
  monitor: '#6E92B5', // screens, code graph
  // derived darks — surfaces only
  bg: '#0A0B0D',
  wall: '#2B2E34',
  pilaster: '#17191D',
  floor: '#0B0C0E',
  panel: '#33363C',
  // light colours
  spot: '#F6D7A4', // warm exhibit light
  strip: '#C9D4E2', // cool vertical light strips / skylight
};

/** Exhibit floor positions (x along the hall, z in front of the back wall). */
export const EXHIBIT_POS = {
  lobby: [0, -1.6],
  samsung: [14, -1.7],
  hackerrank: [28, -1.8],
  corridor: [38, 0.6],
  gsoc: [48, -1.4],
  deadline: [62, -2.2],
  vault: [76, -1.6],
} as const;

/** Ring colour per exhibit: red security rings, gold for the one success (GSoC) and the lobby. */
export const RING = {
  lobby: '#E0B85A',
  samsung: '#FF3B3B',
  hackerrank: '#FF3B3B',
  corridor: '#FF3B3B',
  gsoc: '#E0B85A',
  deadline: '#FF3B3B',
  vault: '#FF3B3B',
} as const;

export const ARCHWAYS = [7, 21, 33, 43, 55, 69];
/** Lobby is a taller, hazy atrium (ref 4). */
export const LOBBY_END = 7;
export const LOBBY_H = 8;
/** Tall room banners (ref 6): x position on the back wall for each counted room. */
export const BANNER_X = { samsung: 10.35, hackerrank: 24.7, gsoc: 46.1, deadline: 59.7, vault: 72.9 } as const;
