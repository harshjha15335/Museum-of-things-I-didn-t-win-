import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import { cutscene, exhibits, type Exhibit } from '../content/exhibits';
import { CUTSCENE_KEYS } from './cutscenePath';
import { useMuseum } from '../state/store';

/**
 * Fixed camera stations with eased travel, push-in, idle drift and pointer parallax (spec C3).
 */
// Keep tweens time-accurate even when frames are slow, so travel never stretches out.
gsap.ticker.lagSmoothing(0);

const v = (a: [number, number, number]) => new THREE.Vector3(...a);

function stationView(ex: Exhibit, pushed: boolean) {
  const s = ex.station;
  if (!pushed) return { pos: v(s.pos), target: v(s.target), fov: s.fov };
  if (s.pushIn) return { pos: v(s.pushIn.pos), target: v(s.pushIn.target), fov: s.fov };
  return { pos: v(s.pos).lerp(v(s.target), 0.35), target: v(s.target), fov: s.fov };
}

/** The camera must not pass through the corridor partition (x 33–43, z 3.6). */
function waypoints(from: THREE.Vector3, to: THREE.Vector3) {
  const inCorridor = (p: THREE.Vector3) => p.x > 32.5 && p.x < 43.5 && p.z < 3.6;
  const a = inCorridor(from);
  const b = inCorridor(to);
  if (a === b) return [];
  const inside = a ? from : to;
  const outside = a ? to : from;
  // exit through whichever open end of the corridor faces the other station
  const exitX = outside.x > inside.x ? 44 : 32.2;
  return [new THREE.Vector3(exitX, 1.72, 2.9)];
}

export function CameraRig() {
  const { camera } = useThree();
  const cam = camera as THREE.PerspectiveCamera;
  const pos = useRef(new THREE.Vector3());
  const target = useRef(new THREE.Vector3());
  const fov = useRef(42);
  const dip = useRef(0);
  const pointer = useRef({ x: 0, y: 0 });
  const parallax = useRef(new THREE.Vector3());
  const tween = useRef<gsap.core.Timeline | gsap.core.Tween | null>(null);
  const lookTmp = useRef(new THREE.Vector3());

  // Initial placement: the current station, no travel.
  useEffect(() => {
    const st = useMuseum.getState();
    const view = stationView(exhibits[st.station], false);
    pos.current.copy(view.pos);
    target.current.copy(view.target);
    fov.current = view.fov;
  }, []);

  useEffect(() => {
    const coarse = window.matchMedia?.('(pointer: coarse)').matches;
    if (coarse) return;
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  useEffect(() => {
    const fade = () => document.getElementById('fade-cut');

    const go = (ex: Exhibit, pushed: boolean, kind: 'travel' | 'push' | 'return') => {
      tween.current?.kill();
      const view = stationView(ex, pushed);
      const reduced = useMuseum.getState().reducedMotion;
      const done = () => {
        if (kind === 'travel') useMuseum.getState().arrive();
      };

      if (reduced) {
        // 400 ms cross-fade cut instead of travel (spec C3 / E5).
        const el = fade();
        const tl = gsap.timeline({ onComplete: done });
        if (el && kind === 'travel') tl.to(el, { opacity: 1, duration: 0.2, ease: 'none' });
        tl.call(() => {
          pos.current.copy(view.pos);
          target.current.copy(view.target);
          fov.current = view.fov;
        });
        if (el && kind === 'travel') tl.to(el, { opacity: 0, duration: 0.2, ease: 'none' });
        tween.current = tl;
        return;
      }

      const from = pos.current.clone();
      const fromT = target.current.clone();
      const fromF = fov.current;
      const pts = [from, ...waypoints(from, view.pos), view.pos];
      const curve = pts.length > 2 ? new THREE.CatmullRomCurve3(pts, false, 'centripetal') : null;
      const p = { t: 0 };
      tween.current = gsap.to(p, {
        t: 1,
        duration: kind === 'travel' ? 1.4 : 0.9,
        ease: kind === 'travel' ? 'power2.inOut' : 'power3.out',
        onUpdate: () => {
          if (curve) curve.getPoint(p.t, pos.current);
          else pos.current.lerpVectors(from, view.pos, p.t);
          target.current.lerpVectors(fromT, view.target, p.t);
          fov.current = fromF + (view.fov - fromF) * p.t;
          // subtle "walk" dip of 0.1 m and back during travel
          dip.current = kind === 'travel' ? -0.1 * Math.sin(Math.PI * p.t) : 0;
        },
        onComplete: () => {
          dip.current = 0;
          done();
        },
      });
    };

    const playCutscene = () => {
      tween.current?.kill();
      const k0 = CUTSCENE_KEYS[0];
      pos.current.set(...k0.pos);
      target.current.set(...k0.target);
      fov.current = k0.fov;
      const tl = gsap.timeline();
      cutscene.forEach((shot, i) => {
        const a = CUTSCENE_KEYS[i];
        const b = CUTSCENE_KEYS[Math.min(i + 1, CUTSCENE_KEYS.length - 1)];
        const p = { t: 0 };
        const A = { pos: v(a.pos), target: v(a.target) };
        const B = { pos: v(b.pos), target: v(b.target) };
        const reduced = useMuseum.getState().reducedMotion;
        tl.to(p, {
          t: 1,
          duration: shot.duration,
          ease: 'sine.inOut',
          onStart: () => {
            if (reduced) {
              pos.current.copy(B.pos);
              target.current.copy(B.target);
              fov.current = b.fov;
            }
          },
          onUpdate: () => {
            if (reduced) return;
            pos.current.lerpVectors(A.pos, B.pos, p.t);
            target.current.lerpVectors(A.target, B.target, p.t);
            fov.current = a.fov + (b.fov - a.fov) * p.t;
          },
        });
      });
      tween.current = tl;
    };

    const endCutscene = () => {
      tween.current?.kill();
      const el = fade();
      const view = stationView(exhibits[useMuseum.getState().station], false);
      const tl = gsap.timeline();
      if (el) tl.to(el, { opacity: 1, duration: 0.35, ease: 'none' });
      tl.call(() => {
        pos.current.copy(view.pos);
        target.current.copy(view.target);
        fov.current = view.fov;
      });
      if (el) tl.to(el, { opacity: 0, duration: 0.6, ease: 'none' });
      tween.current = tl;
    };

    const unsub = useMuseum.subscribe((s, prev) => {
      if (s.cutscene && !prev.cutscene) return playCutscene();
      if (!s.cutscene && prev.cutscene) return endCutscene();
      if (s.station !== prev.station) {
        go(exhibits[s.station], false, 'travel');
      } else if (s.pushedIn !== prev.pushedIn && !s.traveling) {
        go(exhibits[s.station], s.pushedIn, s.pushedIn ? 'push' : 'return');
      }
    });
    return () => {
      unsub();
      tween.current?.kill();
    };
  }, []);

  useFrame(({ clock }) => {
    const s = useMuseum.getState();
    const calm = s.reducedMotion;
    const idle = !s.traveling && !calm && !s.cutscene;
    const drift = idle ? Math.sin((clock.elapsedTime / 6) * Math.PI * 2) * 0.03 : 0;

    // Pointer parallax: nudge the look target up to ±0.25 m x / ±0.12 m y, lerp 0.05/frame.
    const still = calm || s.cutscene;
    const px = still ? 0 : pointer.current.x * 0.25;
    const py = still ? 0 : -pointer.current.y * 0.12;
    parallax.current.x += (px - parallax.current.x) * 0.05;
    parallax.current.y += (py - parallax.current.y) * 0.05;

    cam.position.set(pos.current.x, pos.current.y + dip.current + drift, pos.current.z);
    lookTmp.current.copy(target.current).add(parallax.current);
    cam.lookAt(lookTmp.current);
    if (Math.abs(cam.fov - fov.current) > 0.01) {
      cam.fov = fov.current;
      cam.updateProjectionMatrix();
    }
  });

  return null;
}
