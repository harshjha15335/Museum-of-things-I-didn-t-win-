import { useMemo, useRef } from 'react';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { exhibits, hud, site, type ExhibitId } from '../content/exhibits';
import { useMuseum } from '../state/store';
import { C, EXHIBIT_POS } from './palette';
import { ArtifactShell, GoldOutline } from './ArtifactShell';
import { makeCanvasTexture, spacedText } from './textures';
import { useExhibit } from './useExhibit';

/** Text accent on the slate face, matches the HUD's cyan (--amber in styles.css). */
const SLATE_ACCENT = '#36E2CF';

/** Where each room's reading slate stands (front-left of the plinth, facing the visitor). */
const SLATE_OFFSET: Partial<Record<ExhibitId, [number, number]>> = {
  samsung: [-3.05, 1.9],
  hackerrank: [-2.3, 1.2],
  gsoc: [-2.3, 1.4],
  deadline: [-2.4, 1.9],
  vault: [-2.4, 1.6],
};

/** A lectern slate: click it (or the plaque button / Enter) to read the room while it is narrated. */
export function Slate({ id }: { id: ExhibitId }) {
  const ex = exhibits.find((e) => e.id === id)!;
  const off = SLATE_OFFSET[id]!;
  const [ex0, ez0] = EXHIBIT_POS[id];
  const x = ex0 + off[0];
  const z = ez0 + off[1];
  const { arrived, phase } = useExhibit(id);
  const readerOpen = useMuseum((s) => s.readerOpen);
  const glow = useRef<THREE.MeshBasicMaterial>(null);

  const tex = useMemo(
    () =>
      makeCanvasTexture(512, 340, (ctx, w, h) => {
        ctx.fillStyle = '#1B1D22';
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = SLATE_ACCENT;
        ctx.lineWidth = 6;
        ctx.strokeRect(14, 14, w - 28, h - 28);
        spacedText(ctx, site.slateSign, w / 2, 62, {
          font: '700 {s}px Inter, system-ui, sans-serif',
          size: 26,
          spacing: 0.3,
          color: SLATE_ACCENT,
        });
        spacedText(ctx, ex.number, w / 2, 150, { font: '800 {s}px "Barlow Condensed", Arial Narrow, sans-serif', size: 110, color: '#E6EEF4' });
        spacedText(ctx, ex.chapter.split('·')[1]?.trim() ?? '', w / 2, 248, {
          font: '600 {s}px "Barlow Condensed", Arial Narrow, sans-serif',
          size: 34,
          color: '#8EA3B4',
          maxWidth: w - 70,
        });
        ctx.fillStyle = 'rgba(54,226,207,0.5)';
        ctx.fillRect(w / 2 - 60, 290, 120, 3);
      }).tex,
    [ex],
  );

  const canRead = arrived && !readerOpen;
  const pulsing = arrived && !readerOpen && phase === 'idle';
  useFrame(({ clock }) => {
    if (!glow.current) return;
    const base = pulsing ? 0.35 + 0.3 * Math.sin(clock.elapsedTime * Math.PI) : arrived ? 0.25 : 0.12;
    glow.current.opacity = base;
  });

  return (
    <group position={[x, 0, z]} rotation={[0, 0.05, 0]}>
      <ArtifactShell
        enabled={canRead}
        pulsing={pulsing}
        onInspect={() => useMuseum.getState().openReader()}
        hitSize={[0.9, 1.4, 0.6]}
        hitCenter={[0, 0.8, 0]}
      >
        {/* base + post */}
        <mesh position={[0, 0.03, 0]} receiveShadow>
          <cylinderGeometry args={[0.3, 0.34, 0.06, 32]} />
          <meshStandardMaterial color={C.gunmetal} roughness={0.45} metalness={0.55} />
        </mesh>
        <mesh position={[0, 0.5, 0]} castShadow>
          <boxGeometry args={[0.08, 0.95, 0.08]} />
          <meshStandardMaterial color={C.gunmetal} roughness={0.45} metalness={0.55} />
        </mesh>
        {/* tilted slate */}
        <group position={[0, 1.02, 0.02]} rotation={[-0.62, 0, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.8, 0.54, 0.04]} />
            <meshStandardMaterial color={C.pilaster} roughness={0.5} metalness={0.4} />
            <GoldOutline />
          </mesh>
          <mesh position={[0, 0, 0.021]}>
            <planeGeometry args={[0.76, 0.5]} />
            <meshStandardMaterial map={tex} emissive="#ffffff" emissiveMap={tex} emissiveIntensity={0.35} roughness={0.6} />
          </mesh>
        </group>
      </ArtifactShell>
      {/* in-world key prompt */}
      {canRead && (
        <Html position={[0, 1.62, 0]} center zIndexRange={[3, 0]} className="world-prompt-wrap">
          <button className="world-prompt" onClick={() => useMuseum.getState().openReader()}>
            <kbd className="key">E</kbd> {id === 'samsung' && phase === 'idle' ? hud.promptInspect : hud.promptRead}
          </button>
        </Html>
      )}
      {/* soft glow pool on the floor so the slate reads as interactive */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.34, 0.6, 48]} />
        <meshBasicMaterial ref={glow} color={C.gold} transparent opacity={0.15} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}
