import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { exhibits } from '../content/exhibits';
import { useMuseum } from '../state/store';
import { ANCHORS, useLayout } from './anchors';

/** Projects the active artifact's bounds to screen pixels each frame (cheap: 8 points). */
export function Projector() {
  const corners = useMemo(() => Array.from({ length: 8 }, () => new THREE.Vector3()), []);
  useFrame(({ camera, size }) => {
    const ex = exhibits[useMuseum.getState().station];
    const b = ANCHORS[ex.id];
    let i = 0;
    for (const x of [b.min.x, b.max.x])
      for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) corners[i++].set(x, y, z);
    let l = Infinity, r = -Infinity, t = Infinity, bt = -Infinity;
    for (const c of corners) {
      c.project(camera);
      const sx = (c.x * 0.5 + 0.5) * size.width;
      const sy = (-c.y * 0.5 + 0.5) * size.height;
      l = Math.min(l, sx); r = Math.max(r, sx); t = Math.min(t, sy); bt = Math.max(bt, sy);
    }
    const prev = useLayout.getState().rect;
    if (!prev || Math.abs(prev.left - l) + Math.abs(prev.right - r) + Math.abs(prev.top - t) + Math.abs(prev.bottom - bt) > 3) {
      useLayout.getState().set({ left: l, right: r, top: t, bottom: bt });
    }
  });
  return null;
}
