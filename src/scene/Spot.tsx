import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { C } from './palette';

/**
 * One gold SpotLight per exhibit at ceiling height in front of the plinth (spec E3),
 * plus a fake volumetric cone. Active: 100% + shadows; otherwise 55%, no shadows.
 */
export function Spot({
  x,
  target,
  active,
  boost = 1,
  lowPower,
  color = C.spot,
  angle = 0.36,
}: {
  x: number;
  target: [number, number, number];
  active: boolean;
  boost?: number;
  lowPower: boolean;
  color?: string;
  angle?: number;
}) {
  const light = useRef<THREE.SpotLight>(null);
  const cone = useRef<THREE.Mesh>(null);
  const { scene } = useThree();
  const tgt = useMemo(() => new THREE.Object3D(), []);
  const pos = useMemo(() => new THREE.Vector3(x, 4.9, 1.2), [x]);
  const FULL = 95 * boost;

  useEffect(() => {
    tgt.position.set(...target);
    scene.add(tgt);
    if (light.current) light.current.target = tgt;
    return () => {
      scene.remove(tgt);
    };
  }, [scene, tgt, target]);

  // Cone geometry from the light down to the floor around the target.
  const coneGeo = useMemo(() => {
    const t = new THREE.Vector3(...target).setY(0);
    const len = pos.distanceTo(t);
    const g = new THREE.ConeGeometry(Math.tan(angle) * len * 0.82, len, 32, 1, true);
    g.translate(0, -len / 2, 0); // apex at origin
    return { g, dir: t.clone().sub(pos).normalize() };
  }, [pos, target, angle]);

  const coneQ = useMemo(
    () => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), coneGeo.dir),
    [coneGeo],
  );

  useFrame((_, dt) => {
    const l = light.current;
    if (!l) return;
    const goal = active ? FULL : FULL * 0.55;
    // ≈600 ms sine-ish ease toward the goal
    l.intensity += (goal - l.intensity) * Math.min(1, dt * 6);
    if (cone.current) {
      const m = cone.current.material as THREE.MeshBasicMaterial;
      const og = active ? 0.075 : 0.04;
      m.opacity += (og - m.opacity) * Math.min(1, dt * 6);
    }
  });

  return (
    <>
      <spotLight
        ref={light}
        position={pos}
        color={color}
        intensity={FULL * 0.55}
        angle={angle}
        penumbra={0.55}
        decay={1.4}
        distance={14}
        castShadow={active && !lowPower}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.0004}
        shadow-camera-near={0.5}
        shadow-camera-far={14}
      />
      {!lowPower && (
        <mesh ref={cone} geometry={coneGeo.g} position={pos} quaternion={coneQ} renderOrder={5}>
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.04}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
            toneMapped={false}
            fog={false}
          />
        </mesh>
      )}
    </>
  );
}

/** Round dark base disc with a thin glowing ring at floor level (spec C2). */
export function Plinth({
  x,
  z,
  radius,
  ring = C.redEmissive,
  lightRing = true,
}: {
  x: number;
  z: number;
  radius: number;
  ring?: string;
  lightRing?: boolean;
}) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.07, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[radius, radius, 0.14, 64]} />
        <meshStandardMaterial color={C.pilaster} roughness={0.6} metalness={0.3} />
      </mesh>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius + 0.06, 0.022, 8, 96]} />
        <meshBasicMaterial color={ring} toneMapped={false} />
      </mesh>
      {/* soft glow halo around the ring */}
      <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius - 0.02, radius + 0.32, 96]} />
        <meshBasicMaterial
          color={ring}
          transparent
          opacity={0.13}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {lightRing && <pointLight position={[0, 0.12, radius * 0.6]} color={ring} intensity={1.6} distance={3.6} decay={1.5} />}
    </group>
  );
}
