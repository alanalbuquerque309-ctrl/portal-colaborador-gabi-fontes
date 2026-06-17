'use client';

import { useEffect, useState } from 'react';
import { IlustracaoCafe } from './PortalIlustracao';

export function PortalBoasVindas() {
  const [nome, setNome] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    fetch('/api/portal/perfil', { credentials: 'include', cache: 'no-store' })
      .then((r) => r.json())
      .then((d: { ok?: boolean; colaborador?: { nome?: string } }) => {
        if (cancel || !d.ok || !d.colaborador?.nome) return;
        const primeiro = String(d.colaborador.nome).trim().split(/\s+/)[0];
        if (primeiro) setNome(primeiro);
      })
      .catch(() => {});
    return () => {
      cancel = true;
    };
  }, []);

  if (!nome) return null;

  return (
    <section className="rounded-2xl border border-cafeteria-200/80 bg-gradient-to-br from-white via-cream-50 to-dourado-50/40 p-5 shadow-sm overflow-hidden relative">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-xl sm:text-2xl text-cafeteria-900">
            Bom te ver aqui{nome ? `, ${nome}` : ''}!
          </h1>
          <p className="text-sm text-cafeteria-600 mt-1 leading-relaxed">
            Seu portal de reconhecimento, comunicação e rotina da semana.
          </p>
        </div>
        <IlustracaoCafe className="w-20 h-16 sm:w-24 sm:h-20 shrink-0 opacity-95" />
      </div>
    </section>
  );
}
