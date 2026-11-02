import { useMemo } from 'react';
import { exhibits } from '../../content/exhibits';
import { C, EXHIBIT_POS, RING } from '../palette';
import { Plinth } from '../Spot';
import { makeCanvasTexture, spacedText } from '../textures';

const ex = exhibits.find((e) => e.id === 'lobby')!;

/** 00 · Lobby: short plinth with an angled gold plaque; gold title band on the back wall. */
export function Lobby() {
  const [x, z] = EXHIBIT_POS.lobby;
  const plaque = useMemo(
    () =>
      makeCanvasTexture(1024, 512, (ctx, w, h) => {
        ctx.fillStyle = C.gold;
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = C.ink;
        ctx.lineWidth = 6;
        ctx.strokeRect(28, 28, w - 56, h - 56);
        const words = (ex.props?.plaque ?? '').split(' ');
        // Two balanced lines
        const mid = Math.ceil(words.length / 2);
        const lines = [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
        lines.forEach((ln, i) =>
          spacedText(ctx, ln, w / 2, h / 2 + (i - 0.5) * 110, {
            font: '600 {s}px Fraunces, Georgia, serif',
            size: 64,
            spacing: 0.08,
            color: C.ink,
            maxWidth: w - 120,
          }),
        );
      }).tex,
    [],
  );
  const band = useMemo(
    () =>
      makeCanvasTexture(2048, 307, (ctx, w, h) => {
        ctx.fillStyle = C.gold;
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = C.ink;
        ctx.fillRect(0, 18, w, 3);
        ctx.fillRect(0, h - 21, w, 3);
        spacedText(ctx, ex.props?.band ?? '', w / 2, h / 2 + 4, {
          font: '600 {s}px Fraunces, Georgia, serif',
          size: 120,
          spacing: 0.12,
          color: C.ink,
          maxWidth: w - 160,
        });
      }).tex,
    [],
  );

  return (
    <group>
      <Plinth x={x} z={z} radius={1.05} ring={RING.lobby} />
      <group position={[x, 0.14, z]}>
        <mesh position={[0, 0.575, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.1, 1.15, 0.7]} />
          <meshStandardMaterial color={C.gunmetal} roughness={0.5} metalness={0.5} />
        </mesh>
        {/* angled plaque on top, tilted toward the visitor */}
        <mesh position={[0, 1.2, 0.05]} rotation={[-0.75, 0, 0]} castShadow>
          <boxGeometry args={[1.0, 0.5, 0.03]} />
          <meshStandardMaterial color={C.gold} roughness={0.35} metalness={0.6} />
        </mesh>
        <mesh position={[0, 1.2 + 0.0109, 0.05 + 0.0117]} rotation={[-0.75, 0, 0]}>
          <planeGeometry args={[0.96, 0.47]} />
          <meshStandardMaterial map={plaque} roughness={0.4} metalness={0.25} />
        </mesh>
      </group>
      {/* gold title band on the back wall */}
      <mesh position={[x, 3.9, -3.98]}>
        <planeGeometry args={[6, 0.9]} />
        <meshStandardMaterial map={band} roughness={0.4} metalness={0.25} emissive={C.gold} emissiveIntensity={0.08} />
      </mesh>
    </group>
  );
}
