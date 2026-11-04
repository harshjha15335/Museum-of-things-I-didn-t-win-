/**
 * Device profile for the phone build (mobile audit, 4 Nov).
 * Read once at startup: changing light counts or shadow settings later forces every shader to recompile,
 * which is a visible stall on a phone. The runtime PerfMonitor (Scene.tsx) can still drop to low power.
 */
const mq = (q: string) => typeof window !== 'undefined' && !!window.matchMedia?.(q).matches;

const nav = (typeof navigator !== 'undefined' ? navigator : {}) as Navigator & { deviceMemory?: number };
const cores = nav.hardwareConcurrency || 8;
const memory = nav.deviceMemory ?? 8; // Chrome/Android only; iOS reports nothing
const shortSide = typeof screen !== 'undefined' ? Math.min(screen.width, screen.height) : 1080;

/** Touch-first device (phone or tablet): no hover, no keyboard assumed. */
export const isTouch = mq('(pointer: coarse)') && !mq('(pointer: fine)');
/** Phone-sized screen. */
export const isPhone = isTouch && shortSide < 600;
/** Budget phone: few cores or little memory. Starts in low power (no reflections, no light cones, fewer lights). */
export const isLowEnd =
  new URLSearchParams(typeof location !== 'undefined' ? location.search : '').has('lowpower') ||
  (isTouch && (cores <= 4 || memory <= 3));

export const quality = {
  /** Phones already have 2-3x screens; rendering above 1.5x costs fill rate for detail nobody sees at arm's length. */
  dpr: (isLowEnd ? [1, 1] : isPhone ? [1, 1.5] : [1, 1.5]) as [number, number],
  antialias: !isLowEnd,
  shadowMap: isPhone ? 512 : 1024,
  reflectorResolution: isPhone ? 256 : 512,
};
