'use client';

import { useEffect } from 'react';

const SW_VERSION = 'portal-v4-relatorio-post';

/**
 * Após deploy, força service worker novo no PWA instalado (celular).
 * Uma vez por versão: desregistra SW antigo e recarrega.
 */
export function PortalPwaRefresh() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const key = 'portal_sw_version';
    const stored = localStorage.getItem(key);

    const bumpVersion = () => {
      localStorage.setItem(key, SW_VERSION);
    };

    if (stored === SW_VERSION) {
      void navigator.serviceWorker.getRegistrations().then((regs) => {
        for (const reg of regs) void reg.update();
      });
      return;
    }

    navigator.serviceWorker.getRegistrations().then((regs) => {
      if (regs.length === 0) {
        bumpVersion();
        return;
      }
      Promise.all(regs.map((r) => r.unregister())).finally(() => {
        bumpVersion();
        window.location.reload();
      });
    });
  }, []);

  return null;
}
