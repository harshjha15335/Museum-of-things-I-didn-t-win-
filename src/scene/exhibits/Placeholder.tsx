import * as THREE from 'three';
import { C, EXHIBIT_POS, RING } from '../palette';
import { Plinth } from '../Spot';

/** Stand-in for rooms built in later phases: a dark pedestal with an empty glass case "awaiting exhibit". */
export function Placeholder({ id }: { id: 'hackerrank' | 'gsoc' | 'deadline' | 'vault' }) {
  const [x, z] = EXHIBIT_POS[id];
  return (
    <group>
      <Plinth x={x} z={z} radius={1.3} ring={RING[id]} />
      <group position={[x, 0.14, z]}>
        <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.8, 1, 0.8]} />
          <meshStandardMaterial color={C.gunmetal} roughness={0.45} metalness={0.55} />
        </mesh>
        <mesh position={[0, 1.36, 0]}>
          <boxGeometry args={[0.72, 0.72, 0.72]} />
          <meshStandardMaterial
            color="#C9D4E2"
            transparent
            opacity={0.12}
            roughness={0.05}
            metalness={0.1}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>
    </group>
  );
}
