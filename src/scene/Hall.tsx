import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import * as THREE from 'three';
import { C, ARCHWAYS } from './palette';

/**
 * One continuous gallery hall from primitives (spec C2).
 * Long axis +X, back wall at z = −4, floor y = 0, ceiling y = 5.
 */
const HALL_MIN_X = -9;
const HALL_MAX_X = 86;
const HALL_LEN = HALL_MAX_X - HALL_MIN_X;
const HALL_CX = (HALL_MIN_X + HALL_MAX_X) / 2;
const DEPTH_FRONT = 8; // floor extends to z = +8
const FLOOR_CZ = (-4 + DEPTH_FRONT) / 2;
const DEPTH = DEPTH_FRONT + 4;

function Instanced({
  positions,
  scale,
  rotation,
  color,
  roughness = 0.5,
  metalness = 0.4,
  emissive,
  basic,
  castShadow,
}: {
  positions: [number, number, number][];
  scale: [number, number, number];
  rotation?: [number, number, number];
  color: string;
  roughness?: number;
  metalness?: number;
  emissive?: string;
  basic?: boolean;
  castShadow?: boolean;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(...(rotation ?? [0, 0, 0])));
    const s = new THREE.Vector3(...scale);
    positions.forEach((p, i) => {
      m.compose(new THREE.Vector3(...p), q, s);
      ref.current!.setMatrixAt(i, m);
    });
    ref.current!.instanceMatrix.needsUpdate = true;
    ref.current!.computeBoundingSphere();
  }, [positions, scale, rotation]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, positions.length]} castShadow={castShadow} receiveShadow>
      <boxGeometry />
      {basic ? (
        <meshBasicMaterial color={color} toneMapped={false} />
      ) : (
        <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} emissive={emissive ?? '#000'} />
      )}
    </instancedMesh>
  );
}

export function Hall() {
  const pilasters = useMemo(() => ARCHWAYS.map((x) => [x, 2.5, -3.75] as [number, number, number]), []);
  const beams = useMemo(() => ARCHWAYS.map((x) => [x, 4.82, FLOOR_CZ] as [number, number, number]), []);
  const tracks = useMemo(() => {
    const out: [number, number, number][] = [];
    for (let x = HALL_MIN_X + 2; x < HALL_MAX_X; x += 3.5) {
      if (x > 33 && x < 43) continue; // corridor has its own beams
      out.push([x, 4.93, 0.6]);
    }
    return out;
  }, []);
  const panelXs = [-5, 3.6, 9.6, 18.4, 24.2, 31.4, 51.8, 58.2, 65.6, 72.2, 80.5];
  const panelFrames = useMemo(() => panelXs.map((x) => [x, 2.35, -3.96] as [number, number, number]), []);
  const panelFills = useMemo(() => panelXs.map((x) => [x, 2.35, -3.9] as [number, number, number]), []);
  const corridorBeams = useMemo(() => [34, 36, 38, 40, 42].map((x) => [x, 4.85, -0.2] as [number, number, number]), []);

  return (
    <group>
      {/* Floor: near-black, glossy so spotlights and rings reflect softly */}
      <mesh position={[HALL_CX, -0.1, FLOOR_CZ]} receiveShadow>
        <boxGeometry args={[HALL_LEN + 15, 0.2, DEPTH]} />
        <meshStandardMaterial color={C.floor} roughness={0.22} metalness={0.35} />
      </mesh>

      {/* Back wall + baseboard + cornice */}
      <mesh position={[HALL_CX, 2.5, -4.05]} receiveShadow>
        <boxGeometry args={[HALL_LEN, 5, 0.1]} />
        <meshStandardMaterial color={C.wall} roughness={0.9} />
      </mesh>
      <mesh position={[HALL_CX, 0.08, -3.98]}>
        <boxGeometry args={[HALL_LEN, 0.16, 0.06]} />
        <meshStandardMaterial color={C.gunmetal} roughness={0.5} metalness={0.5} />
      </mesh>
      <mesh position={[HALL_CX, 4.4, -3.98]}>
        <boxGeometry args={[HALL_LEN, 0.06, 0.06]} />
        <meshStandardMaterial color={C.gunmetal} roughness={0.5} metalness={0.5} />
      </mesh>

      {/* End walls */}
      <mesh position={[HALL_MIN_X, 2.5, FLOOR_CZ]}>
        <boxGeometry args={[0.1, 5, DEPTH]} />
        <meshStandardMaterial color={C.wall} roughness={0.9} />
      </mesh>
      <mesh position={[HALL_MAX_X, 2.5, FLOOR_CZ]}>
        <boxGeometry args={[0.1, 5, DEPTH]} />
        <meshStandardMaterial color={C.wall} roughness={0.9} />
      </mesh>

      {/* Ceiling (navy, exposed) */}
      <mesh position={[HALL_CX, 5.05, FLOOR_CZ]}>
        <boxGeometry args={[HALL_LEN, 0.1, DEPTH]} />
        <meshStandardMaterial color={C.navy} roughness={0.95} />
      </mesh>

      {/* Archways: pilasters against the back wall + beams spanning the depth */}
      <Instanced positions={pilasters} scale={[0.7, 5, 0.5]} color={C.pilaster} roughness={0.8} metalness={0.2} />
      <Instanced positions={beams} scale={[0.7, 0.36, DEPTH]} color={C.gunmetal} roughness={0.5} metalness={0.5} />

      {/* Track-light fixtures every 3.5 m */}
      <Instanced positions={tracks} scale={[0.14, 0.14, 0.22]} color="#0B0F14" roughness={0.6} metalness={0.3} />

      {/* Framed wall panels between exhibits */}
      <Instanced positions={panelFrames} scale={[1.7, 2.3, 0.06]} color={C.gunmetal} roughness={0.5} metalness={0.5} />
      <Instanced positions={panelFills} scale={[1.46, 2.06, 0.04]} color={C.panel} roughness={0.85} metalness={0.05} />

      {/* Security corridor x 33–43: partition, tight beams, red floor line, decorative lasers */}
      <mesh position={[38, 2.5, 3.6]} castShadow receiveShadow>
        <boxGeometry args={[10, 5, 0.2]} />
        <meshStandardMaterial color={C.gunmetal} roughness={0.55} metalness={0.45} />
      </mesh>
      <Instanced positions={corridorBeams} scale={[0.25, 0.3, 7.6]} color={C.gunmetal} roughness={0.5} metalness={0.5} />
      <mesh position={[38, 0.006, 1.1]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[10, 0.04]} />
        <meshBasicMaterial color={C.redEmissive} toneMapped={false} />
      </mesh>
      <Lasers />
    </group>
  );
}

function Lasers() {
  const lasers = useMemo(() => {
    const defs: [THREE.Vector3, THREE.Vector3][] = [
      [new THREE.Vector3(34, 0.4, -3.9), new THREE.Vector3(37.5, 2.6, 3.5)],
      [new THREE.Vector3(36.5, 2.8, -3.9), new THREE.Vector3(39.5, 0.5, 3.5)],
      [new THREE.Vector3(39, 0.5, -3.9), new THREE.Vector3(42.4, 2.2, 3.5)],
      [new THREE.Vector3(41.5, 2.4, -3.9), new THREE.Vector3(43, 0.7, 3.5)],
    ];
    return defs.map(([a, b]) => {
      const mid = a.clone().add(b).multiplyScalar(0.5);
      const len = a.distanceTo(b);
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
      return { mid, len, q };
    });
  }, []);
  return (
    <>
      {lasers.map((l, i) => (
        <mesh key={i} position={l.mid} quaternion={l.q}>
          <cylinderGeometry args={[0.008, 0.008, l.len, 4, 1, true]} />
          <meshBasicMaterial color={C.redEmissive} toneMapped={false} transparent opacity={0.8} />
        </mesh>
      ))}
    </>
  );
}

/** Night fill, cool wall wash and monitor-blue ambient (spec E3). */
export function HallLights({ lowPower }: { lowPower: boolean }) {
  const washXs = [-3.5, 3.5, 10.5, 17.5, 24.5, 31.5, 45.5, 52.5, 59.5, 66.5, 73.5, 80.5];
  return (
    <>
      <hemisphereLight args={['#5D7898', '#0B1016', 0.9]} />
      <ambientLight color={C.monitor} intensity={0.12} />
      <Env />
      {washXs.map((x) => (
        <pointLight
          key={x}
          position={[x, 4.4, -3.3]}
          color="#9FB4CC"
          intensity={lowPower ? 9 : 11}
          distance={7.5}
          decay={1}
        />
      ))}
      {/* Very dim red-ish pool in the corridor so it reads darker but not black */}
      <pointLight position={[38, 4.2, 0.5]} color="#9FB4CC" intensity={1.1} distance={7} decay={1.4} />
    </>
  );
}

/** A dim, locally generated environment so gunmetal and the glossy floor catch soft highlights. */
function Env() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.12;
    return () => {
      scene.environment = null;
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
  return null;
}
