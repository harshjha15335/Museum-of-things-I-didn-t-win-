import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { MeshReflectorMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { exhibits, site } from '../content/exhibits';
import { C, ARCHWAYS, BANNER_X, EXHIBIT_POS, LOBBY_END, LOBBY_H } from './palette';
import { makeCanvasTexture, spacedText } from './textures';

/**
 * One continuous gallery hall from primitives (spec C2, reworked v2.2).
 * Long axis +X, back wall at z = −4, floor y = 0, ceiling y = 5 (lobby atrium y = 8).
 * Architecture cues from the references: room fins with vertical light strips and tall
 * room banners (entrance shot), a floor guide line (corridor shot), a tall hazy lobby
 * (lobby shot), red floor lasers and a mirror-dark floor (secured-gallery shot).
 */
const HALL_MIN_X = -9;
const HALL_MAX_X = 86;
const HALL_LEN = HALL_MAX_X - HALL_MIN_X;
const DEPTH_FRONT = 8; // floor extends to z = +8
const FLOOR_CZ = (-4 + DEPTH_FRONT) / 2;
const DEPTH = DEPTH_FRONT + 4;
const MAIN_LEN = HALL_MAX_X - LOBBY_END;
const MAIN_CX = (LOBBY_END + HALL_MAX_X) / 2;
const LOBBY_LEN = LOBBY_END - HALL_MIN_X;
const LOBBY_CX = (HALL_MIN_X + LOBBY_END) / 2;
const FIN_DEPTH = 2.6;
const FIN_CZ = -4 + FIN_DEPTH / 2;

type V3 = [number, number, number];

function Instanced({
  positions,
  scale,
  color,
  roughness = 0.5,
  metalness = 0.4,
  basic,
}: {
  positions: V3[];
  scale: V3;
  color: string;
  roughness?: number;
  metalness?: number;
  basic?: boolean;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3(...scale);
    positions.forEach((p, i) => {
      m.compose(new THREE.Vector3(...p), q, s);
      ref.current!.setMatrixAt(i, m);
    });
    ref.current!.instanceMatrix.needsUpdate = true;
    ref.current!.computeBoundingSphere();
  }, [positions, scale]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, positions.length]} receiveShadow={!basic}>
      <boxGeometry />
      {basic ? (
        <meshBasicMaterial color={color} toneMapped={false} />
      ) : (
        <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
      )}
    </instancedMesh>
  );
}

function Floor({ lowPower }: { lowPower: boolean }) {
  return (
    <mesh position={[(HALL_MIN_X + HALL_MAX_X) / 2, 0, FLOOR_CZ]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[HALL_LEN + 15, DEPTH]} />
      {lowPower ? (
        <meshStandardMaterial color={C.floor} roughness={0.22} metalness={0.35} />
      ) : (
        <MeshReflectorMaterial
          color={C.floor}
          roughness={0.32}
          metalness={0.45}
          blur={[400, 120]}
          resolution={512}
          mixBlur={1}
          mixStrength={1.6}
          mixContrast={1.1}
          mirror={0.6}
          depthScale={0.9}
          minDepthThreshold={0.35}
          maxDepthThreshold={1.3}
        />
      )}
    </mesh>
  );
}

/** Tall room banner (ref 6 idea, our own design): number + label, gold rule, light strip above. */
function Banner({ x, number }: { x: number; number: string }) {
  const tex = useMemo(
    () =>
      makeCanvasTexture(256, 820, (ctx, w, h) => {
        ctx.fillStyle = '#1A1C21';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = C.gold;
        ctx.fillRect(0, 0, w, 10);
        spacedText(ctx, site.bannerLabel, w / 2, 70, {
          font: '700 {s}px Inter, system-ui, sans-serif',
          size: 22,
          spacing: 0.3,
          color: C.stone,
        });
        spacedText(ctx, number, w / 2, 190, {
          font: '600 {s}px Fraunces, Georgia, serif',
          size: 150,
          spacing: 0.02,
          color: C.gold,
        });
        ctx.fillStyle = 'rgba(224,184,90,0.55)';
        ctx.fillRect(w / 2 - 1, 300, 2, h - 380);
      }).tex,
    [number],
  );
  return (
    <group position={[x, 0, -3.9]}>
      <mesh position={[0, 2.35, 0]}>
        <planeGeometry args={[0.95, 3.05]} />
        <meshStandardMaterial map={tex} roughness={0.8} emissive="#ffffff" emissiveMap={tex} emissiveIntensity={0.18} />
      </mesh>
      {/* small picture light above the banner */}
      <mesh position={[0, 4.02, 0.06]}>
        <boxGeometry args={[0.7, 0.03, 0.08]} />
        <meshBasicMaterial color={C.strip} toneMapped={false} />
      </mesh>
    </group>
  );
}

export function Hall({ lowPower }: { lowPower: boolean }) {
  const fins = useMemo(() => ARCHWAYS.map((x) => [x, 2.5, FIN_CZ] as V3), []);
  const beams = useMemo(() => ARCHWAYS.map((x) => [x, 4.82, FLOOR_CZ] as V3), []);
  // vertical light strips on both faces of every fin, near the open edge
  const strips = useMemo(
    () => ARCHWAYS.flatMap((x) => [[x - 0.31, 2.4, -1.55] as V3, [x + 0.31, 2.4, -1.55] as V3]),
    [],
  );
  const tracks = useMemo(() => {
    const out: V3[] = [];
    for (let x = LOBBY_END + 1.5; x < HALL_MAX_X; x += 3.5) {
      if (x > 33 && x < 43) continue; // corridor has its own beams
      out.push([x, 4.93, 0.6]);
    }
    return out;
  }, []);
  const panelXs = [-5.2, 4.2, 18.2, 31.2, 51.6, 65.4, 81];
  // (banners sit just left of each exhibit; panels fill the gaps)
  const panelFrames = useMemo(() => panelXs.map((x) => [x, 2.35, -3.96] as V3), []);
  const panelFills = useMemo(() => panelXs.map((x) => [x, 2.35, -3.92] as V3), []);
  const panelLights = useMemo(() => panelXs.map((x) => [x, 3.72, -3.86] as V3), []);
  const corridorBeams = useMemo(() => [34.5, 36.5, 38.5, 40.5, 42].map((x) => [x, 4.85, -0.2] as V3), []);

  return (
    <group>
      <Floor lowPower={lowPower} />

      {/* Back wall: tall atrium section for the lobby, 5 m elsewhere */}
      <mesh position={[LOBBY_CX, LOBBY_H / 2, -4.05]} receiveShadow>
        <boxGeometry args={[LOBBY_LEN, LOBBY_H, 0.1]} />
        <meshStandardMaterial color={C.wall} roughness={0.9} />
      </mesh>
      <mesh position={[MAIN_CX, 2.5, -4.05]} receiveShadow>
        <boxGeometry args={[MAIN_LEN, 5, 0.1]} />
        <meshStandardMaterial color={C.wall} roughness={0.9} />
      </mesh>
      <mesh position={[(HALL_MIN_X + HALL_MAX_X) / 2, 0.08, -3.98]}>
        <boxGeometry args={[HALL_LEN, 0.16, 0.06]} />
        <meshStandardMaterial color={C.gunmetal} roughness={0.5} metalness={0.5} />
      </mesh>
      <mesh position={[MAIN_CX, 4.4, -3.98]}>
        <boxGeometry args={[MAIN_LEN, 0.06, 0.06]} />
        <meshStandardMaterial color={C.gunmetal} roughness={0.5} metalness={0.5} />
      </mesh>

      {/* End walls */}
      <mesh position={[HALL_MIN_X, LOBBY_H / 2, FLOOR_CZ]}>
        <boxGeometry args={[0.1, LOBBY_H, DEPTH]} />
        <meshStandardMaterial color={C.wall} roughness={0.9} />
      </mesh>
      <mesh position={[HALL_MAX_X, 2.5, FLOOR_CZ]}>
        <boxGeometry args={[0.1, 5, DEPTH]} />
        <meshStandardMaterial color={C.wall} roughness={0.9} />
      </mesh>

      {/* Ceilings: 5 m hall, 8 m lobby atrium with a header wall where they meet */}
      <mesh position={[MAIN_CX, 5.05, FLOOR_CZ]}>
        <boxGeometry args={[MAIN_LEN, 0.1, DEPTH]} />
        <meshStandardMaterial color={C.ink} roughness={0.95} />
      </mesh>
      <mesh position={[LOBBY_CX, LOBBY_H + 0.05, FLOOR_CZ]}>
        <boxGeometry args={[LOBBY_LEN, 0.1, DEPTH]} />
        <meshStandardMaterial color={C.ink} roughness={0.95} />
      </mesh>
      <mesh position={[LOBBY_END, (5 + LOBBY_H) / 2, FLOOR_CZ]}>
        <boxGeometry args={[0.7, LOBBY_H - 5, DEPTH]} />
        <meshStandardMaterial color={C.wall} roughness={0.9} />
      </mesh>
      {/* round skylight in the atrium ceiling */}
      <mesh position={[0, LOBBY_H - 0.01, -0.6]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.3, 64]} />
        <meshBasicMaterial color={C.strip} toneMapped={false} />
      </mesh>
      <mesh position={[0, LOBBY_H - 0.04, -0.6]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.3, 2.6, 64]} />
        <meshStandardMaterial color={C.gunmetal} roughness={0.5} metalness={0.5} side={THREE.DoubleSide} />
      </mesh>

      {/* hazy shaft of cool light under the skylight */}
      <mesh position={[0, LOBBY_H / 2, -1.0]} renderOrder={5}>
        <cylinderGeometry args={[2.1, 3.2, LOBBY_H, 48, 1, true]} />
        <meshBasicMaterial
          color={C.strip}
          transparent
          opacity={0.035}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
          toneMapped={false}
          fog={false}
        />
      </mesh>

      {/* Room fins (dividers) + depth-spanning beams + cool vertical light strips */}
      <Instanced positions={fins} scale={[0.6, 5, FIN_DEPTH]} color={C.pilaster} roughness={0.75} metalness={0.25} />
      <Instanced positions={beams} scale={[0.7, 0.36, DEPTH]} color={C.gunmetal} roughness={0.5} metalness={0.5} />
      <Instanced positions={strips} scale={[0.03, 3.8, 0.06]} color={C.strip} basic />

      {/* Track-light fixtures */}
      <Instanced positions={tracks} scale={[0.14, 0.14, 0.22]} color="#060708" roughness={0.6} metalness={0.3} />

      {/* Framed wall panels with small picture lights */}
      <Instanced positions={panelFrames} scale={[1.7, 2.3, 0.06]} color={C.gunmetal} roughness={0.5} metalness={0.5} />
      <Instanced positions={panelFills} scale={[1.46, 2.06, 0.04]} color={C.panel} roughness={0.85} metalness={0.05} />
      <Instanced positions={panelLights} scale={[1.1, 0.03, 0.08]} color={C.strip} basic />

      {/* Tall room banners */}
      {exhibits
        .filter((e) => e.id in BANNER_X)
        .map((e) => (
          <Banner key={e.id} x={BANNER_X[e.id as keyof typeof BANNER_X]} number={e.number} />
        ))}

      {/* Gold floor guide line along the visitor path (red through the corridor) */}
      <mesh position={[(HALL_MIN_X + 3 + 33) / 2, 0.004, 2.7]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[33 - (HALL_MIN_X + 3), 0.09]} />
        <meshBasicMaterial color={C.gold} toneMapped={false} />
      </mesh>
      <mesh position={[(43 + HALL_MAX_X - 3) / 2, 0.004, 2.7]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[HALL_MAX_X - 3 - 43, 0.09]} />
        <meshBasicMaterial color={C.gold} toneMapped={false} />
      </mesh>

      {/* Security corridor x 33–43: partition, tight beams, red floor line, lasers */}
      <mesh position={[38, 2.5, 3.6]} castShadow receiveShadow>
        <boxGeometry args={[10, 5, 0.2]} />
        <meshStandardMaterial color={C.gunmetal} roughness={0.55} metalness={0.45} />
      </mesh>
      <Instanced positions={corridorBeams} scale={[0.25, 0.3, 7.6]} color={C.gunmetal} roughness={0.5} metalness={0.5} />
      <mesh position={[38, 0.005, 1.6]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[10.6, 0.09]} />
        <meshBasicMaterial color={C.redEmissive} toneMapped={false} />
      </mesh>
      <Lasers />
    </group>
  );
}

function laser(a: THREE.Vector3, b: THREE.Vector3) {
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const len = a.distanceTo(b);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  return { mid, len, q };
}

/** Red security lasers: diagonal beams in the corridor, low floor beams framing each gallery bay. */
function Lasers() {
  const beams = useMemo(() => {
    const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
    const out = [
      laser(V(34, 0.4, -3.9), V(37.5, 2.6, 3.5)),
      laser(V(36.5, 2.8, -3.9), V(39.5, 0.5, 3.5)),
      laser(V(39, 0.5, -3.9), V(42.4, 2.2, 3.5)),
      laser(V(41.5, 2.4, -3.9), V(43, 0.7, 3.5)),
    ];
    for (const id of ['samsung', 'hackerrank', 'gsoc', 'deadline', 'vault'] as const) {
      const [x] = EXHIBIT_POS[id];
      out.push(laser(V(x - 6.2, 0.12, 1.9), V(x - 1.9, 0.12, -3.95)));
      out.push(laser(V(x + 6.2, 0.12, 1.9), V(x + 1.9, 0.12, -3.95)));
    }
    return out;
  }, []);
  return (
    <>
      {beams.map((l, i) => (
        <group key={i} position={l.mid} quaternion={l.q}>
          <mesh>
            <cylinderGeometry args={[0.007, 0.007, l.len, 4, 1, true]} />
            <meshBasicMaterial color={C.redEmissive} toneMapped={false} />
          </mesh>
          <mesh>
            <cylinderGeometry args={[0.035, 0.035, l.len, 6, 1, true]} />
            <meshBasicMaterial
              color={C.redEmissive}
              toneMapped={false}
              transparent
              opacity={0.16}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        </group>
      ))}
    </>
  );
}

/** Dim night fill, soft neutral wall grazing, cool atrium shaft (spec E3, reworked). */
export function HallLights({ lowPower }: { lowPower: boolean }) {
  const washXs = [10.5, 17.5, 24.5, 31.5, 45.5, 52.5, 59.5, 66.5, 73.5, 80.5];
  return (
    <>
      <hemisphereLight args={['#5F6B7A', '#050506', 0.6]} />
      <ambientLight color="#8A93A0" intensity={0.05} />
      <Env />
      {washXs.map((x) => (
        <pointLight key={x} position={[x, 4.5, -3.4]} color="#B9C2CE" intensity={lowPower ? 7 : 8.5} distance={6.5} decay={1.1} />
      ))}
      {/* Lobby atrium: cool light falling from the skylight, plus two soft wall grazers */}
      <spotLight
        position={[0, LOBBY_H - 0.2, -0.6]}
        color={C.strip}
        intensity={60}
        angle={0.42}
        penumbra={0.9}
        decay={1.2}
        distance={14}
      />
      <pointLight position={[-5, 6.5, -3.2]} color={C.strip} intensity={7} distance={9} decay={1.2} />
      <pointLight position={[4.5, 6.5, -3.2]} color={C.strip} intensity={7} distance={9} decay={1.2} />
      {/* corridor stays darker */}
      <pointLight position={[38, 4.2, 0.5]} color="#B9C2CE" intensity={1.2} distance={7} decay={1.4} />
    </>
  );
}

/** A dim, locally generated environment so gunmetal and the floor catch soft highlights. */
function Env() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.08;
    return () => {
      scene.environment = null;
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
  return null;
}
