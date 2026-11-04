import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { exhibits } from '../../content/exhibits';
import { useMuseum } from '../../state/store';
import { C, EXHIBIT_POS, RING } from '../palette';
import { Plinth } from '../Spot';
import { ArtifactShell, GoldOutline } from '../ArtifactShell';
import { makeCanvasTexture, spacedText } from '../textures';
import { useExhibit } from '../useExhibit';

const ex = exhibits.find((e) => e.id === 'samsung')!;
const split = (s?: string) => (s ?? '').split('|').filter(Boolean);

/** Reveal timeline (seconds after inspect). Push-in takes 0.9 s first. */
export const SAMSUNG_T = {
  nodes: 1.0,
  nodeStagger: 0.15,
  edges: 1.0 + 0.15 * 5,
  edgeDur: 0.6,
  labels: 2.6,
  tags: 3.3,
  dossier: 4.4,
};

const NODES: { x: number; y: number }[] = [
  { x: 190, y: 150 }, // index.js
  { x: 190, y: 372 }, // ui.flow.js
  { x: 500, y: 262 }, // parser.js
  { x: 800, y: 150 }, // retrieval.js
  { x: 820, y: 380 }, // ranker.js
];
const EDGES: [number, number, number][] = [
  // from, to, curve bend
  [0, 2, -40],
  [1, 2, 40],
  [2, 3, -50],
  [3, 4, 50],
  [0, 3, -70],
];

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const easeOut = (v: number) => 1 - Math.pow(1 - clamp01(v), 3);

function drawGraph(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  const names = split(ex.props?.graphNodes);
  const labels = split(ex.props?.graphLabels);
  const tags = split(ex.props?.graphTags);

  ctx.fillStyle = '#0E1620';
  ctx.fillRect(0, 0, w, h);
  // faint grid
  ctx.strokeStyle = 'rgba(110,146,181,0.10)';
  ctx.lineWidth = 1;
  for (let gx = 0; gx < w; gx += 32) {
    ctx.beginPath();
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx, h);
    ctx.stroke();
  }
  for (let gy = 0; gy < h; gy += 32) {
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(w, gy);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(110,146,181,0.45)';
  ctx.lineWidth = 3;
  ctx.strokeRect(6, 6, w - 12, h - 12);

  // edges
  const ep = clamp01((t - SAMSUNG_T.edges) / SAMSUNG_T.edgeDur);
  if (ep > 0) {
    ctx.strokeStyle = C.monitor;
    ctx.lineWidth = 4;
    for (const [a, b, bend] of EDGES) {
      const A = NODES[a];
      const B = NODES[b];
      const cx = (A.x + B.x) / 2;
      const cy = (A.y + B.y) / 2 + bend;
      ctx.beginPath();
      ctx.moveTo(A.x, A.y);
      const steps = 40;
      for (let i = 1; i <= Math.floor(steps * ep); i++) {
        const u = i / steps;
        const x = (1 - u) * (1 - u) * A.x + 2 * (1 - u) * u * cx + u * u * B.x;
        const y = (1 - u) * (1 - u) * A.y + 2 * (1 - u) * u * cy + u * u * B.y;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  // nodes
  NODES.forEach((n, i) => {
    const p = easeOut((t - (SAMSUNG_T.nodes + i * SAMSUNG_T.nodeStagger)) / 0.3);
    if (p <= 0) return;
    ctx.globalAlpha = p;
    const r = 15 * p;
    ctx.fillStyle = C.plaster;
    ctx.beginPath();
    ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = C.monitor;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(n.x, n.y, r + 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.font = '600 26px Inter, system-ui, sans-serif';
    ctx.fillStyle = C.plaster;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(names[i] ?? '', n.x, n.y + 30);
    ctx.globalAlpha = 1;
  });

  // section labels
  const lp = easeOut((t - SAMSUNG_T.labels) / 0.4);
  if (lp > 0) {
    ctx.globalAlpha = lp;
    const lx = [190, 500, 810];
    labels.forEach((l, i) =>
      spacedText(ctx, l, lx[i], 58, {
        font: '700 {s}px Inter, system-ui, sans-serif',
        size: 22,
        spacing: 0.2,
        color: C.stone,
      }),
    );
    ctx.globalAlpha = 1;
  }

  // BM25 / MMR tags near retrieval
  const tp = easeOut((t - SAMSUNG_T.tags) / 0.35);
  if (tp > 0) {
    tags.forEach((tag, i) => {
      const bx = 880;
      const by = 206 + i * 46;
      ctx.globalAlpha = tp;
      ctx.fillStyle = 'rgba(224,184,90,0.18)';
      ctx.strokeStyle = C.gold;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(bx, by, 104, 36, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = C.gold;
      ctx.font = '700 22px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(tag, bx + 52, by + 19);
      ctx.globalAlpha = 1;
    });
  }

  // "Illustrative diagram" label (spec B3)
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.font = '600 18px Inter, system-ui, sans-serif';
  ctx.fillStyle = 'rgba(201,197,190,0.75)';
  ctx.fillText(ex.props?.illustrative ?? '', w - 26, h - 22);
  ctx.textAlign = 'left';
}

function Laptop({ x, lit, outline }: { x: number; lit: boolean; outline?: boolean }) {
  return (
    <group position={[x, 0, 0]}>
      <mesh position={[0, 0.0125, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.42, 0.025, 0.29]} />
        <meshStandardMaterial color={C.gunmetal} roughness={0.45} metalness={0.6} />
        {outline && <GoldOutline />}
      </mesh>
      <group position={[0, 0.025, -0.145]} rotation={[-0.32, 0, 0]}>
        <mesh position={[0, 0.14, 0]} castShadow>
          <boxGeometry args={[0.42, 0.28, 0.014]} />
          <meshStandardMaterial color={C.gunmetal} roughness={0.45} metalness={0.6} />
          {outline && <GoldOutline />}
        </mesh>
        <mesh position={[0, 0.14, 0.008]}>
          <planeGeometry args={[0.38, 0.24]} />
          <meshStandardMaterial
            color={lit ? C.monitor : '#2A333D'}
            emissive={lit ? C.monitor : C.plaster}
            emissiveIntensity={lit ? 1.6 : 0.06}
            roughness={0.3}
          />
        </mesh>
      </group>
    </group>
  );
}

/** 01 · Samsung PRISM / ASTFLOW: three laptops on a gunmetal desk, a wall projection that draws a code graph. */
export function Samsung() {
  const [x, z] = EXHIBIT_POS.samsung;
  const { arrived, phase, revealStartedAt } = useExhibit('samsung');
  const graph = useMemo(() => makeCanvasTexture(1024, 512, (ctx, w, h) => drawGraph(ctx, w, h, -1)), []);
  const lastT = useRef(-2);

  // Recovered (or revisit) → graph in its final state.
  useEffect(() => {
    if (phase === 'recovered' && revealStartedAt === null) {
      drawGraph(graph.ctx, 1024, 512, 99);
      graph.tex.needsUpdate = true;
      lastT.current = 99;
    }
  }, [phase, revealStartedAt, graph]);

  useFrame(() => {
    if (revealStartedAt === null) return;
    const reduced = useMuseum.getState().reducedMotion;
    const t = reduced ? 99 : (performance.now() - revealStartedAt) / 1000;
    if (lastT.current >= 6 && t >= 6) return; // finished drawing
    lastT.current = t;
    drawGraph(graph.ctx, 1024, 512, t);
    graph.tex.needsUpdate = true;
  });

  const canInspect = arrived && phase === 'idle';
  const deskTop = 0.14 + 0.76;

  return (
    <group>
      <Plinth x={x} z={z} radius={2.3} ring={RING.samsung} />
      <group position={[x, 0, z]}>
        {/* desk */}
        <mesh position={[0, deskTop - 0.03, 0]} castShadow receiveShadow>
          <boxGeometry args={[3.6, 0.06, 1.3]} />
          <meshStandardMaterial color={C.gunmetal} roughness={0.5} metalness={0.5} />
        </mesh>
        {[
          [-1.7, -0.55],
          [1.7, -0.55],
          [-1.7, 0.55],
          [1.7, 0.55],
        ].map(([lx, lz], i) => (
          <mesh key={i} position={[lx, 0.14 + 0.365, lz]} castShadow>
            <boxGeometry args={[0.06, 0.73, 0.06]} />
            <meshStandardMaterial color={C.pilaster} roughness={0.5} metalness={0.5} />
          </mesh>
        ))}
        <group position={[0, deskTop, 0.05]}>
          <Laptop x={-1.05} lit={false} />
          <ArtifactShell
            enabled={canInspect}
            pulsing={canInspect}
            onInspect={() => useMuseum.getState().inspect()}
            hitSize={[0.6, 0.45, 0.5]}
            hitCenter={[0, 0.18, -0.05]}
          >
            <Laptop x={0} lit outline />
          </ArtifactShell>
          <Laptop x={1.05} lit={false} />
          {/* stack of three textbooks */}
          {[C.ink, C.stone, C.gunmetal].map((c, i) => (
            <mesh key={c} position={[1.55, 0.03 + i * 0.06, -0.2]} rotation={[0, 0.12 * (i - 1), 0]} castShadow>
              <boxGeometry args={[0.3, 0.055, 0.4]} />
              <meshStandardMaterial color={c} roughness={0.8} />
            </mesh>
          ))}
        </group>
      </group>

      {/* wall projection panel 5.2 × 2.6 */}
      <mesh position={[x, 2.3, -3.97]}>
        <boxGeometry args={[5.4, 2.8, 0.04]} />
        <meshStandardMaterial color={C.gunmetal} roughness={0.5} metalness={0.5} />
      </mesh>
      <mesh position={[x, 2.3, -3.94]}>
        <planeGeometry args={[5.2, 2.6]} />
        <meshBasicMaterial map={graph.tex} toneMapped={false} color="#C9D4E0" />
      </mesh>
    </group>
  );
}
