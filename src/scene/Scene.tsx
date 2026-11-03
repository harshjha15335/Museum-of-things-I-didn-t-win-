import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { exhibits } from '../content/exhibits';
import { useMuseum } from '../state/store';
import { Hall, HallLights } from './Hall';
import { CameraRig } from './CameraRig';
import { Spot } from './Spot';
import { C, EXHIBIT_POS } from './palette';
import { Lobby } from './exhibits/Lobby';
import { Samsung } from './exhibits/Samsung';
import { Placeholder } from './exhibits/Placeholder';
import { Vault } from './exhibits/Vault';
import { Slate } from './Slate';

/** Weak-GPU detection (spec F4): first 60 frames under 30 fps → no shadows, no cones. */
function PerfMonitor() {
  const frames = useRef(0);
  const total = useRef(0);
  useFrame((_, dt) => {
    if (frames.current >= 60) return;
    // skip the first few frames (shader compile)
    if (frames.current++ < 5) return;
    total.current += dt;
    if (frames.current === 60) {
      const fps = 55 / total.current;
      if (fps < 30) useMuseum.getState().setLowPower(true);
    }
  });
  return null;
}

const SPOTS = exhibits
  .map((e, i) => ({ id: e.id, i }))
  .filter((s) => s.id !== 'corridor')
  .map((s) => {
    const [x, z] = EXHIBIT_POS[s.id];
    const y = s.id === 'deadline' || s.id === 'vault' ? 1.4 : 0.8;
    return { ...s, x, target: [x, y, z] as [number, number, number] };
  });

function Spots() {
  const station = useMuseum((s) => s.station);
  const started = useMuseum((s) => s.started);
  const lowPower = useMuseum((s) => s.lowPower);
  return (
    <>
      {SPOTS.map((s) => (
        <Spot
          key={s.id}
          x={s.x}
          target={s.target}
          active={started ? station === s.i : s.i === 0}
          boost={s.id === 'gsoc' ? 1.4 : 1}
          angle={s.id === 'gsoc' ? 0.42 : 0.36}
          lowPower={lowPower}
        />
      ))}
    </>
  );
}

export function Scene() {
  const lowPower = useMuseum((s) => s.lowPower);
  const initial = exhibits[useMuseum.getState().station].station;
  return (
    <Canvas
      shadows={{ type: THREE.PCFSoftShadowMap }}
      dpr={[1, 1.5]}
      camera={{ fov: initial.fov, near: 0.1, far: 120, position: initial.pos }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 0.95;
        gl.outputColorSpace = THREE.SRGBColorSpace;
      }}
      onPointerMissed={() => (document.body.style.cursor = '')}
    >
      <color attach="background" args={[C.bg]} />
      <fog attach="fog" args={[C.bg, 16, 42]} />
      <HallLights lowPower={lowPower} />
      <Hall lowPower={lowPower} />
      <Spots />
      <Lobby />
      <Samsung />
      <Placeholder id="hackerrank" />
      <Placeholder id="gsoc" />
      <Placeholder id="deadline" />
      <Vault />
      {(['samsung', 'hackerrank', 'gsoc', 'deadline', 'vault'] as const).map((id) => (
        <Slate key={id} id={id} />
      ))}
      <CameraRig />
      <PerfMonitor />
    </Canvas>
  );
}
