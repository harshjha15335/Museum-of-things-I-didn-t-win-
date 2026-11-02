import { C, EXHIBIT_POS } from '../palette';
import { Plinth } from '../Spot';

/** Phase 1 stand-in for rooms built in later phases: plinth + a covered shape "being installed". */
export function Placeholder({ id, ring }: { id: 'hackerrank' | 'gsoc' | 'deadline' | 'vault'; ring?: string }) {
  const [x, z] = EXHIBIT_POS[id];
  return (
    <group>
      <Plinth x={x} z={z} radius={1.3} ring={ring} />
      <mesh position={[x, 0.14 + 0.55, z]} castShadow receiveShadow>
        <cylinderGeometry args={[0.55, 0.75, 1.1, 24]} />
        <meshStandardMaterial color={C.stone} roughness={0.95} metalness={0} />
      </mesh>
    </group>
  );
}
