import * as THREE from 'three';

/** Wait for web fonts so canvas text uses Fraunces / Inter, then call draw again. */
export function whenFontsReady(cb: () => void) {
  if (typeof document === 'undefined' || !document.fonts) return;
  Promise.all([
    document.fonts.load('600 40px Fraunces'),
    document.fonts.load('600 40px Inter'),
  ])
    .catch(() => undefined)
    .then(() => document.fonts.ready)
    .then(cb);
}

export function makeCanvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const redraw = () => {
    ctx.clearRect(0, 0, w, h);
    draw(ctx, w, h);
    tex.needsUpdate = true;
  };
  redraw();
  whenFontsReady(redraw);
  return { tex, ctx, canvas, redraw };
}

/** Draw letter-spaced, centred text that shrinks to fit maxWidth. */
export function spacedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  opts: { font: string; size: number; spacing?: number; color: string; maxWidth?: number },
) {
  let size = opts.size;
  const spacingEm = opts.spacing ?? 0;
  const measure = () => {
    ctx.font = `${opts.font.replace('{s}', String(size))}`;
    const chars = [...text];
    return chars.reduce((acc, ch) => acc + ctx.measureText(ch).width, 0) + spacingEm * size * (chars.length - 1);
  };
  let width = measure();
  while (opts.maxWidth && width > opts.maxWidth && size > 6) {
    size -= 1;
    width = measure();
  }
  ctx.fillStyle = opts.color;
  ctx.textBaseline = 'middle';
  let cx = x - width / 2;
  for (const ch of text) {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + spacingEm * size;
  }
}
