import { useMemo } from 'react';
import { Instanced } from './Hall';
import { C, ARCHWAYS, LOBBY_END, LOBBY_H } from './palette';

/**
 * Architectural detail layer (v2.3), our own geometry in the spirit of the reference shots:
 * framed room portals on columns, wainscot and mouldings, a coffered ceiling with recessed
 * lights and a cove strip, a lobby balcony, wall display cases and a brass floor inlay.
 */
type V3 = [number, number, number];
const MIN_X = -9;
const MAX_X = 86;
const CORRIDOR = (x: number) => x > 33 && x < 43;

export function Architecture() {
  const d = useMemo(() => {
    // --- columns: one at the open end of every fin, one at the front of every portal
    const colXZ: [number, number][] = ARCHWAYS.flatMap((x) => [
      [x, -1.15],
      [x, 3.35],
    ]);
    const shafts = colXZ.map(([x, z]) => [x, 2.45, z] as V3);
    const bases = colXZ.flatMap(([x, z]) => [[x, 0.12, z] as V3, [x, 0.3, z] as V3]);
    const capitals = colXZ.flatMap(([x, z]) => [[x, 4.48, z] as V3, [x, 4.62, z] as V3]);
    const flutes = colXZ.flatMap(([x, z]) => [-0.16, 0, 0.16].map((o) => [x + o, 2.45, z + 0.27] as V3));

    // --- wainscot raised panels along the back wall (skip behind the corridor partition gap)
    const wains: V3[] = [];
    for (let x = MIN_X + 1; x < MAX_X - 0.6; x += 1.3) {
      if (ARCHWAYS.some((a) => Math.abs(a - x) < 0.6)) continue;
      wains.push([x, 0.62, -3.97]);
    }

    // --- coffered ceiling (main hall only) + recessed lights in alternate coffers
    const cofferX: V3[] = [];
    for (let x = LOBBY_END + 1.75; x < MAX_X; x += 1.75) {
      if (ARCHWAYS.some((a) => Math.abs(a - x) < 0.5) || CORRIDOR(x)) continue;
      cofferX.push([x, 4.88, 2]);
    }
    const cofferZ: V3[] = [-2, 0, 2, 4, 6].map((z) => [(LOBBY_END + MAX_X) / 2, 4.88, z] as V3);
    const recessed: V3[] = [];
    for (let x = LOBBY_END + 2.6; x < MAX_X; x += 3.5) {
      if (CORRIDOR(x)) continue;
      for (const z of [-1, 3]) recessed.push([x, 4.99, z]);
    }

    // --- lobby balcony: rail posts along the back and the end wall
    const posts: V3[] = [];
    for (let x = MIN_X + 0.4; x < LOBBY_END - 0.4; x += 0.6) posts.push([x, 5.45, -2.75]);
    for (let z = -2.75; z < 6.5; z += 0.6) posts.push([MIN_X + 1.3, 5.45, z]);

    // --- wall display cases between exhibits
    const caseXs = [5.5, 8.5, 19.5, 22.5, 44.5, 53.5, 56.5, 67.5, 70.5];
    const casePeds = caseXs.map((x) => [x, 0.45, -3.25] as V3);
    const caseGlass = caseXs.map((x) => [x, 1.17, -3.25] as V3);
    const caseLids = caseXs.map((x) => [x, 1.45, -3.25] as V3);
    const caseObjs = caseXs.map((x, i) => [x, 1.02 + (i % 3) * 0.03, -3.25] as V3);

    // --- brass floor inlay: two long lines + cross lines at each archway
    const inlayCross = ARCHWAYS.map((x) => [x, 0.003, 0.2] as V3);
    return { shafts, bases, capitals, flutes, wains, cofferX, cofferZ, recessed, posts, casePeds, caseGlass, caseLids, caseObjs, inlayCross };
  }, []);

  const brass = '#6E5B33';
  return (
    <group>
      {/* Columns */}
      <Instanced positions={d.shafts} scale={[0.5, 4.2, 0.5]} color={C.pilaster} roughness={0.6} metalness={0.3} />
      <Instanced positions={d.flutes} scale={[0.05, 3.9, 0.03]} color="#0F1013" roughness={0.8} />
      <Instanced positions={d.bases} scale={[0.78, 0.18, 0.78]} color={C.gunmetal} roughness={0.45} metalness={0.55} />
      <Instanced positions={d.capitals} scale={[0.8, 0.16, 0.8]} color={C.gunmetal} roughness={0.45} metalness={0.55} />

      {/* Wainscot, chair rail, crown moulding, cove light */}
      <Instanced positions={d.wains} scale={[1.05, 0.72, 0.04]} color="#3A3E46" roughness={0.7} metalness={0.15} />
      <mesh position={[(MIN_X + MAX_X) / 2, 1.1, -3.95]}>
        <boxGeometry args={[MAX_X - MIN_X, 0.07, 0.1]} />
        <meshStandardMaterial color={C.gunmetal} roughness={0.4} metalness={0.6} />
      </mesh>
      <mesh position={[(LOBBY_END + MAX_X) / 2, 4.86, -3.92]}>
        <boxGeometry args={[MAX_X - LOBBY_END, 0.18, 0.22]} />
        <meshStandardMaterial color={C.gunmetal} roughness={0.45} metalness={0.5} />
      </mesh>
      <mesh position={[(LOBBY_END + MAX_X) / 2, 4.73, -3.86]}>
        <boxGeometry args={[MAX_X - LOBBY_END, 0.02, 0.04]} />
        <meshBasicMaterial color="#7F8FA3" toneMapped={false} />
      </mesh>

      {/* Coffered ceiling + recessed warm lights */}
      <Instanced positions={d.cofferX} scale={[0.16, 0.22, 12]} color="#262930" roughness={0.75} metalness={0.2} />
      <Instanced positions={d.cofferZ} scale={[MAX_X - LOBBY_END, 0.22, 0.16]} color="#262930" roughness={0.75} metalness={0.2} />
      <Instanced positions={d.recessed} scale={[0.42, 0.02, 0.42]} color="#E9DCC4" basic />

      {/* Lobby balcony at the atrium's mid-height */}
      <mesh position={[(MIN_X + LOBBY_END) / 2, 5, -3.35]} castShadow>
        <boxGeometry args={[LOBBY_END - MIN_X, 0.3, 1.3]} />
        <meshStandardMaterial color={C.pilaster} roughness={0.7} metalness={0.3} />
      </mesh>
      <mesh position={[MIN_X + 0.65, 5, 1.85]}>
        <boxGeometry args={[1.3, 0.3, 9.9]} />
        <meshStandardMaterial color={C.pilaster} roughness={0.7} metalness={0.3} />
      </mesh>
      <Instanced positions={d.posts} scale={[0.04, 0.6, 0.04]} color={C.gunmetal} roughness={0.4} metalness={0.6} />
      <mesh position={[(MIN_X + LOBBY_END) / 2, 5.78, -2.75]}>
        <boxGeometry args={[LOBBY_END - MIN_X, 0.06, 0.08]} />
        <meshStandardMaterial color={C.gunmetal} roughness={0.4} metalness={0.6} />
      </mesh>
      <mesh position={[MIN_X + 1.3, 5.78, 1.85]}>
        <boxGeometry args={[0.08, 0.06, 9.9]} />
        <meshStandardMaterial color={C.gunmetal} roughness={0.4} metalness={0.6} />
      </mesh>
      {/* soffit light under the balcony edge */}
      <mesh position={[(MIN_X + LOBBY_END) / 2, 4.84, -2.72]}>
        <boxGeometry args={[LOBBY_END - MIN_X, 0.02, 0.04]} />
        <meshBasicMaterial color={C.strip} toneMapped={false} />
      </mesh>
      {/* lobby crown under the atrium ceiling */}
      <mesh position={[(MIN_X + LOBBY_END) / 2, LOBBY_H - 0.15, -3.9]}>
        <boxGeometry args={[LOBBY_END - MIN_X, 0.24, 0.24]} />
        <meshStandardMaterial color={C.gunmetal} roughness={0.45} metalness={0.5} />
      </mesh>

      {/* Display cases */}
      <Instanced positions={d.casePeds} scale={[0.62, 0.9, 0.62]} color={C.gunmetal} roughness={0.45} metalness={0.55} />
      <GlassCases positions={d.caseGlass} />
      <Instanced positions={d.caseLids} scale={[0.66, 0.06, 0.66]} color={C.pilaster} roughness={0.5} metalness={0.5} />
      <Instanced positions={d.caseObjs} scale={[0.14, 0.14, 0.14]} color={C.gold} basic />

      {/* Brass floor inlay */}
      <mesh position={[(MIN_X + MAX_X) / 2, 0.003, -3.0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[MAX_X - MIN_X, 0.05]} />
        <meshBasicMaterial color={brass} />
      </mesh>
      <mesh position={[(MIN_X + MAX_X) / 2, 0.003, 4.4]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[MAX_X - MIN_X, 0.05]} />
        <meshBasicMaterial color={brass} />
      </mesh>
      <Instanced positions={d.inlayCross} scale={[0.05, 0.006, 7.4]} color={brass} basic />
    </group>
  );
}

function GlassCases({ positions }: { positions: V3[] }) {
  return (
    <>
      {positions.map((p, i) => (
        <mesh key={i} position={p} renderOrder={4}>
          <boxGeometry args={[0.58, 0.5, 0.58]} />
          <meshStandardMaterial color="#C9D4E2" transparent opacity={0.14} roughness={0.05} metalness={0.2} depthWrite={false} />
        </mesh>
      ))}
    </>
  );
}
