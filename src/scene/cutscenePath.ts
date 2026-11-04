import type { Vec3 } from '../content/exhibits';

/** Camera keyframes for the opening cutscene; shot i glides from KEYS[i] to KEYS[i+1]. */
export const CUTSCENE_KEYS: { pos: Vec3; target: Vec3; fov: number }[] = [
  { pos: [0, 7.2, 5.5], target: [0, 0.6, -1.6], fov: 52 }, // high in the atrium, looking down at the lobby plinth
  { pos: [-2.5, 4.2, 4.8], target: [1.5, 2.6, -3.5], fov: 50 }, // descending past the balcony
  { pos: [9.5, 2.4, 3.4], target: [14, 1.6, -3.4], fov: 48 }, // into the hall, Samsung bay
  { pos: [22, 2.1, 3.1], target: [28, 1.4, -3.2], fov: 46 }, // HackerRank bay
  { pos: [31.5, 1.8, 2.9], target: [40, 1.4, 0], fov: 50 }, // corridor mouth, lasers
  { pos: [44.6, 2.1, 2.9], target: [48, 1.5, -2.6], fov: 46 }, // GSoC bay
  { pos: [62, 2.6, 4.6], target: [72, 1.8, -3], fov: 46 }, // down the hall toward the vault
  { pos: [72.8, 2.2, 4.2], target: [76, 1.8, -3], fov: 44 }, // vault
];
