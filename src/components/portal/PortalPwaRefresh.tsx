'use client';

import { useEffect } from 'react';

/** Força o service worker a buscar versão nova após deploy (PWA instalado no celular). */
export function PortalPwaRefresh() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker.getRegistrations().then((regs) => {
      for (const reg of regs) {
        void reg.update();
      }
    });
  }, []);

  return null;
}
