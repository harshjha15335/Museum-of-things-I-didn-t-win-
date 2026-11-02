/** The only seven colours (spec E1) plus the allowed derived surface darks. */
export const C = {
  plaster: '#E7E4DE',
  stone: '#C9C5BE',
  gunmetal: '#2B3138',
  navy: '#1C2733',
  gold: '#E0B85A',
  red: '#B33A3A',
  redEmissive: '#FF4A4A',
  monitor: '#6E92B5',
  // derived darks — surfaces only
  bg: '#10171F',
  wall: '#323A43',
  pilaster: '#1F252C',
  floor: '#151B22',
  panel: '#4A5561',
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

export const ARCHWAYS = [7, 21, 33, 43, 55, 69];
