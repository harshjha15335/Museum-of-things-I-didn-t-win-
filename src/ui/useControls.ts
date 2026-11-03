import { useEffect } from 'react';
import { useMuseum } from '../state/store';
import { narrator } from '../audio/narration';

/**
 * Keyboard, discrete wheel and swipe navigation (spec C4).
 * One wheel gesture = one station; 900 ms debounce; trackpad inertia ignored during travel.
 */
export function useControls() {
  useEffect(() => {
    const S = () => useMuseum.getState();
    let lastWheel = 0;

    const onKey = (e: KeyboardEvent) => {
      const s = S();
      if (!s.started || s.cutscene) return;
      const onButton = (e.target as HTMLElement)?.closest?.('button, a, input, textarea');
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        if (s.mode === 'quick') s.stopTour();
        s.goNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        if (s.mode === 'quick') s.stopTour();
        s.goBack();
      } else if ((e.key === 'Enter' || e.key === ' ') && !onButton) {
        e.preventDefault();
        if (s.mode === 'full') s.inspect();
      } else if (e.key === 'M' && e.shiftKey) {
        s.toggleMute();
      } else if (e.key === 'r' || e.key === 'R') {
        if (s.mode === 'full') s.replay();
      } else if (e.key === 's' || e.key === 'S') {
        if (s.mode === 'full') narrator.skip();
      }
    };

    const onWheel = (e: WheelEvent) => {
      const s = S();
      if (!s.started || s.cutscene || Math.abs(e.deltaY) < 4) return;
      // let the reading panel scroll normally
      if ((e.target as HTMLElement)?.closest?.('.reader')) return;
      const now = performance.now();
      if (s.traveling || now - lastWheel < 900) {
        lastWheel = now; // keep swallowing the same inertial gesture
        return;
      }
      lastWheel = now;
      if (s.mode === 'quick') s.stopTour();
      if (e.deltaY > 0) s.goNext();
      else s.goBack();
    };

    let tx = 0;
    let ty = 0;
    const onTouchStart = (e: TouchEvent) => {
      tx = e.touches[0].clientX;
      ty = e.touches[0].clientY;
    };
    const onTouchEnd = (e: TouchEvent) => {
      const s = S();
      if (!s.started || s.cutscene) return;
      const dx = e.changedTouches[0].clientX - tx;
      const dy = e.changedTouches[0].clientY - ty;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        if (s.mode === 'quick') s.stopTour();
        if (dx < 0) s.goNext();
        else s.goBack();
      }
    };

    window.addEventListener('keydown', onKey);
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, []);
}
