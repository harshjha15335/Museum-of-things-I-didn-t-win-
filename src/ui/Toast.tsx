import { useEffect, useState } from 'react';
import { useMuseum } from '../state/store';

export function Toast() {
  const toast = useMuseum((s) => s.toast);
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!toast) return;
    setShow(true);
    const id = window.setTimeout(() => setShow(false), 2200);
    return () => window.clearTimeout(id);
  }, [toast]);
  return (
    <div className={`toast ${show ? 'on' : ''}`} role="status">
      <span className="toast-diamond" aria-hidden />
      {toast?.text}
    </div>
  );
}
