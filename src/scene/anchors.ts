import * as THREE from 'three';
import { create } from 'zustand';
import type { ExhibitId } from '../content/exhibits';
import { EXHIBIT_POS } from './palette';

/**
 * World-space bounds of each exhibit's artifact. The plaque card is placed from the
 * artifact's projected screen position so it never covers it (spec C7).
 */
const box = (x: number, z: number, w: number, h: number, d: number, y0 = 0) =>
  new THREE.Box3(new THREE.Vector3(x - w / 2, y0, z - d / 2), new THREE.Vector3(x + w / 2, y0 + h, z + d / 2));

const P = EXHIBIT_POS;
export const ANCHORS: Record<ExhibitId, THREE.Box3> = {
  lobby: box(P.lobby[0], P.lobby[1], 1.4, 1.5, 1),
  samsung: box(P.samsung[0], P.samsung[1], 3.6, 1.25, 1.3),
  hackerrank: box(P.hackerrank[0], P.hackerrank[1], 2, 1.3, 1.2),
  corridor: box(P.corridor[0], P.corridor[1], 2, 1, 1),
  gsoc: box(P.gsoc[0], P.gsoc[1], 1.2, 1.9, 1.2),
  deadline: box(P.deadline[0], -3.9, 3, 3, 0.2, 0.4),
  vault: box(P.vault[0], -3.9, 4.4, 4.4, 0.4, 0.1),
};

export type ScreenRect = { left: number; top: number; right: number; bottom: number } | null;

export const useLayout = create<{ rect: ScreenRect; set: (r: ScreenRect) => void }>((set) => ({
  rect: null,
  set: (rect) => set({ rect }),
}));
