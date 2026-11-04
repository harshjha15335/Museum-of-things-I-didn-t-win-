import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { exhibits } from '../../content/exhibits';
import { useMuseum } from '../../state/store';
import { C } from '../palette';
import { Instanced } from '../Hall';
import { ArtifactShell, GoldOutline } from '../ArtifactShell';
import { makeCanvasTexture, spacedText } from '../textures';
import { useExhibit } from '../useExhibit';

/**
 * 05 · The Vault (finale, Harsh's request 3 Nov). A steel vault wall with a round door.
 * Inspect: the wheel spins, the door swings out on its right hinge and a warm room with
 * barred gates is revealed. The campaign file hangs on the back wall.
 * Our own geometry, built from Harsh's two reference photos for mood only.
 */
const ex = exhibits.find((e) => e.id === 'vault')!;
export const VAULT_CX = 77.2;
const CY = 1.75;
const R = 1.45;
const FACE_Z = -1.0; // front face of the vault wall
const BACK_Z = -3.85;
const STEEL = '#8E949B';
const STEEL_DARK = '#5E646B';

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const ease = (v: number) => (v < 0.5 ? 2 * v * v : 1 - Math.pow(-2 * v + 2, 2) / 2);

type V3 = [number, number, number];

export function Vault() {
  const { arrived, phase, mode } = useExhibit('vault');
  const reduced = useMuseum((s) => s.reducedMotion);
  const door = useRef<THREE.Group>(null);
  const wheel = useRef<THREE.Group>(null);
  const lamp = useRef<THREE.PointLight>(null);
  const glow = useRef<THREE.MeshBasicMaterial>(null);
  // Wall-clock time since the door was cracked (frame-rate independent; already open on revisit).
  const openedAt = useRef<number | null>(phase === 'idle' ? null : -100);
  const open = phase !== 'idle';

  useFrame(({ clock }) => {
    if (!open) openedAt.current = null;
    else if (openedAt.current === null) openedAt.current = reduced ? -100 : clock.elapsedTime;
    const k = openedAt.current === null ? 0 : clock.elapsedTime - openedAt.current;
    if (wheel.current) wheel.current.rotation.z = -ease(clamp01(k / 1.4)) * Math.PI * 2.5;
    if (door.current) door.current.rotation.y = ease(clamp01((k - 1.3) / 2.6)) * 1.9;
    const light = clamp01((k - 1.6) / 1.6);
    if (lamp.current) lamp.current.intensity = 2 + light * 22;
    if (glow.current) glow.current.opacity = 0.15 + light * 0.85;
  });

  const facade = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-3.2, 0);
    s.lineTo(3.2, 0);
    s.lineTo(3.2, 4.7);
    s.lineTo(-3.2, 4.7);
    s.lineTo(-3.2, 0);
    const hole = new THREE.Path();
    hole.absarc(0, CY, R + 0.03, 0, Math.PI * 2, true);
    s.holes.push(hole);
    return new THREE.ExtrudeGeometry(s, { depth: 0.3, bevelEnabled: false, curveSegments: 64 });
  }, []);

  const rivets = useMemo(() => {
    const out: V3[] = [];
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2;
      out.push([VAULT_CX + Math.cos(a) * (R + 0.42), CY + Math.sin(a) * (R + 0.42), FACE_Z + 0.02]);
    }
    for (const x of [-2.9, -2.3, 2.3, 2.9])
      for (let y = 0.4; y < 4.5; y += 0.45) out.push([VAULT_CX + x, y, FACE_Z + 0.02]);
    return out;
  }, []);

  // barred gates just behind the opening, with the middle pair standing open
  const bars = useMemo(() => {
    const out: { p: V3; h: number }[] = [];
    for (let dx = -R + 0.14; dx < R - 0.1; dx += 0.15) {
      if (Math.abs(dx) < 0.42) continue;
      const h = 2 * Math.sqrt(R * R - dx * dx) - 0.12;
      out.push({ p: [VAULT_CX + dx, CY, FACE_Z - 0.55], h });
    }
    return out;
  }, []);

  const poster = useMemo(
    () =>
      makeCanvasTexture(768, 520, (ctx, w, h) => {
        ctx.fillStyle = '#20150F';
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = '#D4AC62';
        ctx.lineWidth = 4;
        ctx.strokeRect(22, 22, w - 44, h - 44);
        const p = ex.props ?? {};
        spacedText(ctx, p.posterKicker ?? '', w / 2, 92, { font: '700 {s}px "JetBrains Mono", monospace', size: 24, spacing: 0.3, color: '#D4AC62' });
        spacedText(ctx, p.posterTitle ?? '', w / 2, 210, { font: '800 {s}px "Barlow Condensed", Arial Narrow, sans-serif', size: 104, color: '#F3EBDD', maxWidth: w - 90 });
        spacedText(ctx, p.posterSub ?? '', w / 2, 300, { font: '600 {s}px "Barlow Condensed", Arial Narrow, sans-serif', size: 44, color: '#B3A68F', maxWidth: w - 90 });
        ctx.fillStyle = 'rgba(200,50,58,0.9)';
        ctx.fillRect(w / 2 - 170, 370, 340, 66);
        spacedText(ctx, p.posterStamp ?? '', w / 2, 404, { font: '800 {s}px "Barlow Condensed", Arial Narrow, sans-serif', size: 40, spacing: 0.2, color: '#F3EBDD' });
      }).tex,
    [],
  );

  const canInspect = arrived && phase === 'idle' && mode === 'full';

  return (
    <group>
      {/* Vault wall */}
      <mesh geometry={facade} position={[VAULT_CX, 0, FACE_Z - 0.3]} castShadow receiveShadow>
        <meshStandardMaterial color={STEEL} roughness={0.42} metalness={0.75} />
      </mesh>
      <mesh position={[VAULT_CX, CY, FACE_Z + 0.02]}>
        <torusGeometry args={[R + 0.1, 0.09, 12, 96]} />
        <meshStandardMaterial color={C.gilt} roughness={0.35} metalness={0.85} />
      </mesh>
      <mesh position={[VAULT_CX, CY, FACE_Z + 0.01]}>
        <torusGeometry args={[R + 0.6, 0.04, 8, 96]} />
        <meshStandardMaterial color={STEEL_DARK} roughness={0.4} metalness={0.8} />
      </mesh>
      <Instanced positions={rivets} scale={[0.06, 0.06, 0.04]} color={STEEL_DARK} roughness={0.35} metalness={0.85} />
      {/* hinge blocks */}
      {[CY + 0.95, CY - 0.95].map((y) => (
        <mesh key={y} position={[VAULT_CX + R + 0.22, y, FACE_Z + 0.1]}>
          <boxGeometry args={[0.34, 0.42, 0.24]} />
          <meshStandardMaterial color={STEEL_DARK} roughness={0.35} metalness={0.85} />
        </mesh>
      ))}

      {/* The room behind */}
      <group>
        <mesh position={[VAULT_CX, 1.8, BACK_Z]} receiveShadow>
          <planeGeometry args={[4.2, 3.6]} />
          <meshStandardMaterial color="#E4C99A" roughness={0.9} />
        </mesh>
        {[-2.1, 2.1].map((dx) => (
          <mesh key={dx} position={[VAULT_CX + dx, 1.8, (FACE_Z - 0.3 + BACK_Z) / 2]} rotation={[0, dx < 0 ? Math.PI / 2 : -Math.PI / 2, 0]}>
            <planeGeometry args={[FACE_Z - 0.3 - BACK_Z, 3.6]} />
            <meshStandardMaterial color="#D8BB8A" roughness={0.9} />
          </mesh>
        ))}
        <mesh position={[VAULT_CX, 3.6, (FACE_Z - 0.3 + BACK_Z) / 2]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[4.2, FACE_Z - 0.3 - BACK_Z]} />
          <meshStandardMaterial color="#CDB083" roughness={0.95} />
        </mesh>
        <mesh position={[VAULT_CX, 0.012, (FACE_Z - 0.3 + BACK_Z) / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[4.2, FACE_Z - 0.3 - BACK_Z]} />
          <meshStandardMaterial color="#5A3A22" roughness={0.6} />
        </mesh>
        {/* skirting */}
        <mesh position={[VAULT_CX, 0.12, BACK_Z + 0.02]}>
          <boxGeometry args={[4.2, 0.24, 0.04]} />
          <meshStandardMaterial color="#4A2E1B" roughness={0.6} />
        </mesh>
        {/* ceiling lamp */}
        <mesh position={[VAULT_CX, 3.5, -2.9]}>
          <sphereGeometry args={[0.16, 20, 12]} />
          <meshBasicMaterial ref={glow} color="#FFE6B8" transparent opacity={0.15} toneMapped={false} />
        </mesh>
        <pointLight ref={lamp} position={[VAULT_CX, 3.1, -2.6]} color="#FFD49A" intensity={2} distance={6} decay={1.3} />

        {/* The campaign file on the back wall */}
        <mesh position={[VAULT_CX, 1.75, BACK_Z + 0.05]}>
          <boxGeometry args={[1.86, 1.3, 0.05]} />
          <meshStandardMaterial color={C.gilt} roughness={0.35} metalness={0.8} />
        </mesh>
        <mesh position={[VAULT_CX, 1.75, BACK_Z + 0.085]}>
          <planeGeometry args={[1.7, 1.15]} />
          <meshStandardMaterial map={poster} emissive="#ffffff" emissiveMap={poster} emissiveIntensity={0.3} roughness={0.7} />
        </mesh>
      </group>

      {/* Barred gates */}
      {bars.map((b, i) => (
        <mesh key={i} position={b.p}>
          <cylinderGeometry args={[0.018, 0.018, b.h, 6]} />
          <meshStandardMaterial color="#3B3F45" roughness={0.4} metalness={0.8} />
        </mesh>
      ))}
      {[-1, 1].map((side) =>
        [CY - 0.6, CY + 0.6].map((y) => {
          const half = Math.sqrt(R * R - (y - CY) ** 2) - 0.1;
          const w = half - 0.42;
          return (
            <mesh key={`${side}${y}`} position={[VAULT_CX + side * (0.42 + w / 2), y, FACE_Z - 0.55]}>
              <boxGeometry args={[w, 0.04, 0.03]} />
              <meshStandardMaterial color="#3B3F45" roughness={0.4} metalness={0.8} />
            </mesh>
          );
        }),
      )}

      {/* The door: pivots on its right hinge */}
      <group ref={door} position={[VAULT_CX + R, CY, FACE_Z - 0.12]}>
        <ArtifactShell
          enabled={canInspect}
          pulsing={canInspect}
          onInspect={() => useMuseum.getState().inspect()}
          hitSize={[R * 2, R * 2, 0.6]}
          hitCenter={[-R, 0, 0]}
        >
          <group position={[-R, 0, 0]}>
            <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[R, R, 0.46, 72]} />
              <meshStandardMaterial color={STEEL} roughness={0.38} metalness={0.8} />
              <GoldOutline />
            </mesh>
            {/* front rings */}
            {[R * 0.92, R * 0.7, R * 0.4].map((r) => (
              <mesh key={r} position={[0, 0, 0.235]}>
                <torusGeometry args={[r, 0.035, 8, 72]} />
                <meshStandardMaterial color={STEEL_DARK} roughness={0.35} metalness={0.85} />
              </mesh>
            ))}
            {/* spoke wheel */}
            <group ref={wheel} position={[0, 0, 0.34]}>
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.16, 0.16, 0.2, 24]} />
                <meshStandardMaterial color={C.gilt} roughness={0.3} metalness={0.9} />
              </mesh>
              {Array.from({ length: 8 }, (_, i) => (
                <mesh key={i} rotation={[0, 0, (i / 8) * Math.PI * 2]} position={[0, 0, 0.02]}>
                  <boxGeometry args={[1.5, 0.035, 0.035]} />
                  <meshStandardMaterial color="#C7CCD2" roughness={0.3} metalness={0.9} />
                </mesh>
              ))}
              <mesh position={[0, 0, 0.02]}>
                <torusGeometry args={[0.52, 0.03, 8, 48]} />
                <meshStandardMaterial color="#C7CCD2" roughness={0.3} metalness={0.9} />
              </mesh>
            </group>
            {/* rear face: the bolt ring seen once the door swings out */}
            {Array.from({ length: 18 }, (_, i) => {
              const a = (i / 18) * Math.PI * 2;
              return (
                <mesh key={i} position={[Math.cos(a) * R * 0.78, Math.sin(a) * R * 0.78, -0.3]} rotation={[0, 0, a + Math.PI / 2]}>
                  <cylinderGeometry args={[0.07, 0.07, 0.32, 12]} />
                  <meshStandardMaterial color="#B9BEC4" roughness={0.3} metalness={0.9} />
                </mesh>
              );
            })}
            <mesh position={[0, 0, -0.24]}>
              <torusGeometry args={[R * 0.5, 0.06, 8, 64]} />
              <meshStandardMaterial color={STEEL_DARK} roughness={0.35} metalness={0.85} />
            </mesh>
          </group>
        </ArtifactShell>
      </group>
    </group>
  );
}
