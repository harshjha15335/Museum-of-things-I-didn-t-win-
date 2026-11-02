import { useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { Outlines } from '@react-three/drei';
import * as THREE from 'three';
import { C } from './palette';
import { useMuseum } from '../state/store';

/** Put inside any mesh that should get the artifact's gold outline. */
export function GoldOutline() {
  return <Outlines screenspace thickness={2.5} color={C.gold} transparent opacity={0} angle={0} />;
}

/**
 * Clickable artifact wrapper: the gold outlines of its meshes pulse (2 s loop) on arrival,
 * brighten on hover (150 ms) and the cursor becomes a pointer (spec C4/C5).
 */
export function ArtifactShell({
  enabled,
  pulsing,
  onInspect,
  hitSize,
  hitCenter,
  children,
}: {
  enabled: boolean;
  pulsing: boolean;
  onInspect: () => void;
  hitSize: [number, number, number];
  hitCenter: [number, number, number];
  children: ReactNode;
}) {
  const group = useRef<THREE.Group>(null);
  const hovered = useRef(false);
  const opacity = useRef(0);
  useFrame(({ clock }, dt) => {
    let goal = 0;
    if (enabled && hovered.current) goal = 1;
    else if (enabled && pulsing) goal = 0.3 + 0.5 * (0.5 + 0.5 * Math.sin((clock.elapsedTime / 2) * Math.PI * 2));
    opacity.current += (goal - opacity.current) * Math.min(1, dt * 12);
    group.current?.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.ShaderMaterial | undefined;
      if (m && m.uniforms?.thickness && m.uniforms?.opacity) {
        m.uniforms.opacity.value = opacity.current;
        o.visible = opacity.current > 0.01;
      }
    });
  });
  const setHover = (h: boolean) => {
    hovered.current = h;
    useMuseum.getState().setHoverArtifact(h && enabled);
    document.body.style.cursor = h && enabled ? 'pointer' : '';
  };
  return (
    <group
      ref={group}
      onClick={(e) => {
        if (!enabled) return;
        e.stopPropagation();
        onInspect();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHover(true);
      }}
      onPointerOut={() => setHover(false)}
    >
      {children}
      {/* Generous invisible hit area */}
      <mesh position={hitCenter} scale={hitSize}>
        <boxGeometry />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
    </group>
  );
}
